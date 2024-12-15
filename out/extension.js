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
    let getSuggestionDisposable = vscode.commands.registerCommand('ai-code-assistant.getSuggestion', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const selection = editor.selection;
        const selectedCode = editor.document.getText(selection);
        const entireFileContent = editor.document.getText();
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Fetching AI Suggestion...',
                cancellable: false
            }, async () => {
                const response = await axios_1.default.post(`${backendUrl}/analyze_code`, {
                    code: selectedCode,
                    file_path: editor.document.fileName,
                    language: editor.document.languageId,
                    request_type: 'suggestion',
                    file_content: entireFileContent
                });
                showSuggestionInWebview(context, response.data.suggestion, editor.document.languageId);
            });
        }
        catch (error) {
            handleError('Failed to get AI suggestion', error);
        }
    });
    let explainCodeDisposable = vscode.commands.registerCommand('ai-code-assistant.explainCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const selection = editor.selection;
        const selectedCode = editor.document.getText(selection);
        const entireFileContent = editor.document.getText();
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Explaining Code...',
                cancellable: false
            }, async () => {
                const response = await axios_1.default.post(`${backendUrl}/analyze_code`, {
                    code: selectedCode,
                    file_path: editor.document.fileName,
                    language: editor.document.languageId,
                    request_type: 'explain',
                    file_content: entireFileContent
                });
                showSuggestionInWebview(context, response.data.suggestion, 'markdown');
            });
        }
        catch (error) {
            handleError('Failed to explain code', error);
        }
    });
    let refactorCodeDisposable = vscode.commands.registerCommand('ai-code-assistant.refactorCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const selection = editor.selection;
        const selectedCode = editor.document.getText(selection);
        const entireFileContent = editor.document.getText();
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Refactoring Code...',
                cancellable: false
            }, async () => {
                const response = await axios_1.default.post(`${backendUrl}/analyze_code`, {
                    code: selectedCode,
                    file_path: editor.document.fileName,
                    language: editor.document.languageId,
                    request_type: 'refactor',
                    file_content: entireFileContent
                });
                showSuggestionInWebview(context, response.data.suggestion, editor.document.languageId);
            });
        }
        catch (error) {
            handleError('Failed to refactor code', error);
        }
    });
    context.subscriptions.push(getSuggestionDisposable, explainCodeDisposable, refactorCodeDisposable);
}
exports.activate = activate;
function showSuggestionInWebview(context, suggestion, language) {
    const panel = vscode.window.createWebviewPanel('aiSuggestion', 'AI Code Suggestion', vscode.ViewColumn.Beside, {
        enableScripts: true
    });
    panel.webview.html = getWebviewContent(suggestion, language);
}
function getWebviewContent(suggestion, language) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Code Suggestion</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/styles/default.min.css">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/highlight.min.js"></script>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
            pre { background-color: #f4f4f4; padding: 15px; border-radius: 5px; }
        </style>
    </head>
    <body>
        <h2>AI Suggestion</h2>
        <pre><code class="language-${language}">${escapeHtml(suggestion)}</code></pre>
        <script>hljs.highlightAll();</script>
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
