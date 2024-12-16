"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
function activate(context) {
    const backendUrl = vscode.workspace.getConfiguration('aiCodeAssistant').get('backendUrl', 'http://localhost:8000');
    async function processCodeRequest(requestType, title) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }
        const selection = editor.selection;
        const selectedCode = editor.document.getText(selection);
        if (!selectedCode) {
            vscode.window.showErrorMessage('No code selected');
            return;
        }
        const entireFileContent = editor.document.getText();
        try {
            const response = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `${title}...`,
                cancellable: false
            }, async () => {
                return await axios_1.default.post(`${backendUrl}/analyze_code`, {
                    code: selectedCode,
                    file_path: editor.document.fileName,
                    language: editor.document.languageId,
                    request_type: requestType,
                    file_content: entireFileContent
                });
            });
            showResultInWebview(context, response.data.suggestion, editor.document.languageId, title, requestType);
        }
        catch (error) {
            handleError(`Failed to ${title.toLowerCase()}`, error);
        }
    }
    let getSuggestionDisposable = vscode.commands.registerCommand('ai-code-assistant.getSuggestion', () => processCodeRequest('suggestion', 'AI Suggestion'));
    let explainCodeDisposable = vscode.commands.registerCommand('ai-code-assistant.explainCode', () => processCodeRequest('explain', 'Code Explanation'));
    let refactorCodeDisposable = vscode.commands.registerCommand('ai-code-assistant.refactorCode', () => processCodeRequest('refactor', 'Refactored Code'));
    context.subscriptions.push(getSuggestionDisposable, explainCodeDisposable, refactorCodeDisposable);
}
exports.activate = activate;
function showResultInWebview(context, result, language, title, requestType) {
    const panel = vscode.window.createWebviewPanel('aiCodeAssistant', title, vscode.ViewColumn.Beside, {
        enableScripts: true
    });
    panel.webview.html = getWebviewContent(result, language, title, requestType);
    panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
            case 'copy':
                vscode.env.clipboard.writeText(message.text);
                vscode.window.showInformationMessage('Code copied to clipboard');
                return;
            case 'rewrite':
                try {
                    const rewrittenCode = await rewriteCode(message.text, requestType);
                    panel.webview.postMessage({ command: 'update', content: rewrittenCode });
                }
                catch (error) {
                    handleError('Failed to rewrite code', error);
                }
                return;
        }
    }, undefined, context.subscriptions);
}
function getWebviewContent(result, language, title, requestType) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 10px; }
            pre { background-color: #f4f4f4; padding: 10px; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word; }
            button { margin-top: 10px; margin-right: 5px; }
        </style>
    </head>
    <body>
        <h2>${title}</h2>
        <pre><code>${escapeHtml(result)}</code></pre>
        ${requestType === 'refactor' ? '<button onclick="copyCode()">Copy</button>' : ''}
        <button onclick="rewriteCode()">Rewrite</button>
        <script>
            const vscode = acquireVsCodeApi();
            function copyCode() {
                vscode.postMessage({ command: 'copy', text: document.querySelector('code').textContent });
            }
            function rewriteCode() {
                vscode.postMessage({ 
                    command: 'rewrite', 
                    text: document.querySelector('code').textContent
                });
            }
            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'update':
                        document.querySelector('code').textContent = message.content;
                        break;
                }
            });
        </script>
    </body>
    </html>`;
}
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
async function rewriteCode(code, requestType) {
    const backendUrl = vscode.workspace.getConfiguration('aiCodeAssistant').get('backendUrl', 'http://localhost:8000');
    const response = await axios_1.default.post(`${backendUrl}/rewrite_code`, {
        code: code,
        request_type: requestType
    });
    return response.data.suggestion;
}
function handleError(message, error) {
    console.error(error);
    if (axios_1.default.isAxiosError(error) && error.response) {
        vscode.window.showErrorMessage(`${message}: ${error.response.data.detail || error.message}`);
    }
    else {
        vscode.window.showErrorMessage(`${message}: ${error.message}`);
    }
}
function deactivate() { }
exports.deactivate = deactivate;
