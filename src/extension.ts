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

            showResultInWebview(context, response.data.suggestion, editor.document.languageId, title);
        } catch (error) {
            handleError(`Failed to ${title.toLowerCase()}`, error);
        }
    }

    let getSuggestionDisposable = vscode.commands.registerCommand('ai-code-assistant.getSuggestion', () =>
        processCodeRequest('suggestion', 'Getting AI Suggestion'));

    let explainCodeDisposable = vscode.commands.registerCommand('ai-code-assistant.explainCode', () =>
        processCodeRequest('explain', 'Explaining Code'));

    let refactorCodeDisposable = vscode.commands.registerCommand('ai-code-assistant.refactorCode', () =>
        processCodeRequest('refactor', 'Refactoring Code'));

    context.subscriptions.push(
        getSuggestionDisposable,
        explainCodeDisposable,
        refactorCodeDisposable
    );
}

function showResultInWebview(context: vscode.ExtensionContext, result: string, language: string, title: string) {
    const panel = vscode.window.createWebviewPanel(
        'aiCodeAssistant',
        title,
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    panel.webview.html = getWebviewContent(result, language, title);
}

function getWebviewContent(result: string, language: string, title: string) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/styles/default.min.css">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/highlight.min.js"></script>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
            pre { background-color: #f4f4f4; padding: 15px; border-radius: 5px; }
        </style>
    </head>
    <body>
        <h2>${title}</h2>
        <pre><code class="language-${language}">${escapeHtml(result)}</code></pre>
        <script>hljs.highlightAll();</script>
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

function handleError(message: string, error: any) {
    console.error(error);
    if (axios.isAxiosError(error) && error.response) {
        vscode.window.showErrorMessage(`${message}: ${error.response.data.detail || error.message}`);
    } else {
        vscode.window.showErrorMessage(`${message}: ${error.message}`);
    }
}

export function deactivate() { }
