import * as vscode from 'vscode';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {
    const backendUrl = vscode.workspace.getConfiguration('aiCodeAssistant').get<string>('backendUrl', 'http://localhost:8000');

    async function processCodeRequest(requestType: string, title: string) {
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
                return await axios.post(`${backendUrl}/analyze_code`, {
                    code: selectedCode,
                    file_path: editor.document.fileName,
                    language: editor.document.languageId,
                    request_type: requestType,
                    file_content: entireFileContent
                });
            });

            showResultInWebview(context, response.data.suggestion, editor.document.languageId, title, requestType);
        } catch (error) {
            handleError(`Failed to ${title.toLowerCase()}`, error);
        }
    }

    let getSuggestionDisposable = vscode.commands.registerCommand('ai-code-assistant.getSuggestion', () =>
        processCodeRequest('suggestion', 'AI Suggestion'));

    let explainCodeDisposable = vscode.commands.registerCommand('ai-code-assistant.explainCode', () =>
        processCodeRequest('explain', 'Code Explanation'));

    let refactorCodeDisposable = vscode.commands.registerCommand('ai-code-assistant.refactorCode', () =>
        processCodeRequest('refactor', 'Refactored Code'));

    context.subscriptions.push(
        getSuggestionDisposable,
        explainCodeDisposable,
        refactorCodeDisposable
    );
}

function showResultInWebview(context: vscode.ExtensionContext, result: string, language: string, title: string, requestType: string) {
    const panel = vscode.window.createWebviewPanel(
        'aiCodeAssistant',
        title,
        vscode.ViewColumn.Beside,
        {
            enableScripts: true
        }
    );

    panel.webview.html = getWebviewContent(result, language, title, requestType);

    panel.webview.onDidReceiveMessage(
        async message => {
            switch (message.command) {
                case 'copy':
                    vscode.env.clipboard.writeText(message.text);
                    vscode.window.showInformationMessage('Code copied to clipboard');
                    return;
                case 'rewrite':
                    try {
                        vscode.window.showInformationMessage('Refactoring the code')
                        const rewrittenCode = await rewriteCode(message.text, requestType);
                        panel.webview.postMessage({ command: 'update', content: rewrittenCode });
                    } catch (error) {
                        handleError('Failed to rewrite code', error);
                    }
                    return;
            }
        },
        undefined,
        context.subscriptions
    );
}

function getWebviewContent(result: string, language: string, title: string, requestType: string) {
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

function escapeHtml(unsafe: string) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function rewriteCode(code: string, requestType: string): Promise<string> {
    const backendUrl = vscode.workspace.getConfiguration('aiCodeAssistant').get<string>('backendUrl', 'http://localhost:8000');
    const response = await axios.post(`${backendUrl}/rewrite_code`, {
        code: code,
        request_type: requestType
    });
    return response.data.suggestion;
}

function handleError(message: string, error: any) {
    console.error(error);
    if (axios.isAxiosError(error) && error.response) {
        vscode.window.showErrorMessage(`${message}: ${error.response.data.detail || error.message}`);
    } else {
        vscode.window.showErrorMessage(`${message}: ${error.message}`);
    }
}

export function deactivate() { }
