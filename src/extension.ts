import * as vscode from 'vscode';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {
    const backendUrl = vscode.workspace.getConfiguration('aiCodeAssistant').get<string>('backendUrl', 'http://localhost:8000');

    let getSuggestionDisposable = vscode.commands.registerCommand('ai-code-assistant.getSuggestion', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const selection = editor.selection;
        const selectedCode = editor.document.getText(selection);
        const entireFileContent = editor.document.getText();

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Fetching AI Suggestion...',
                cancellable: false
            }, async () => {
                const response = await axios.post(`${backendUrl}/analyze_code`, {
                    code: selectedCode,
                    file_path: editor.document.fileName,
                    language: editor.document.languageId,
                    request_type: 'suggestion',
                    file_content: entireFileContent
                });

                showSuggestionInWebview(context, response.data.suggestion, editor.document.languageId);
            });
        } catch (error) {
            handleError('Failed to get AI suggestion', error);
        }
    });

    let explainCodeDisposable = vscode.commands.registerCommand('ai-code-assistant.explainCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const selection = editor.selection;
        const selectedCode = editor.document.getText(selection);
        const entireFileContent = editor.document.getText();

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Explaining Code...',
                cancellable: false
            }, async () => {
                const response = await axios.post(`${backendUrl}/analyze_code`, {
                    code: selectedCode,
                    file_path: editor.document.fileName,
                    language: editor.document.languageId,
                    request_type: 'explain',
                    file_content: entireFileContent
                });

                showSuggestionInWebview(context, response.data.suggestion, 'markdown');
            });
        } catch (error) {
            handleError('Failed to explain code', error);
        }
    });

    let refactorCodeDisposable = vscode.commands.registerCommand('ai-code-assistant.refactorCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const selection = editor.selection;
        const selectedCode = editor.document.getText(selection);
        const entireFileContent = editor.document.getText();

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Refactoring Code...',
                cancellable: false
            }, async () => {
                const response = await axios.post(`${backendUrl}/analyze_code`, {
                    code: selectedCode,
                    file_path: editor.document.fileName,
                    language: editor.document.languageId,
                    request_type: 'refactor',
                    file_content: entireFileContent
                });

                showSuggestionInWebview(context, response.data.suggestion, editor.document.languageId);
            });
        } catch (error) {
            handleError('Failed to refactor code', error);
        }
    });

    context.subscriptions.push(
        getSuggestionDisposable,
        explainCodeDisposable,
        refactorCodeDisposable
    );
}

function showSuggestionInWebview(context: vscode.ExtensionContext, suggestion: string, language: string) {
    const panel = vscode.window.createWebviewPanel(
        'aiSuggestion',
        'AI Code Suggestion',
        vscode.ViewColumn.Beside,
        {
            enableScripts: true
        }
    );

    panel.webview.html = getWebviewContent(suggestion, language);
}

function getWebviewContent(suggestion: string, language: string) {
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
