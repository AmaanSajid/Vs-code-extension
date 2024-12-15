import * as vscode from 'vscode';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const backendUrl = vscode.workspace.getConfiguration('aiCodeAssistant').get<string>('backendUrl', 'http://localhost:8000');

    async function getProjectContext(): Promise<string> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return '';

        const rootPath = workspaceFolders[0].uri.fsPath;
        let context = '';

        const files = await vscode.workspace.findFiles('**/*.{py,js,ts,html,css}', '**/node_modules/**');
        for (const file of files) {
            const relativePath = path.relative(rootPath, file.fsPath);
            const content = await fs.promises.readFile(file.fsPath, 'utf8');
            context += `File: ${relativePath}\n\n${content}\n\n`;
        }

        return context;
    }

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

                const suggestionDoc = await vscode.workspace.openTextDocument({
                    content: response.data.suggestion,
                    language: editor.document.languageId
                });
                await vscode.window.showTextDocument(suggestionDoc);
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
                    request_type: 'explain'
                });

                const outputChannel = vscode.window.createOutputChannel('AI Code Explanation');
                outputChannel.appendLine('Code Explanation:');
                outputChannel.appendLine(response.data.suggestion);
                outputChannel.show();
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
                    request_type: 'refactor'
                });

                const refactoredDoc = await vscode.workspace.openTextDocument({
                    content: response.data.suggestion,
                    language: editor.document.languageId
                });
                await vscode.window.showTextDocument(refactoredDoc);
            });
        } catch (error) {
            handleError('Failed to refactor code', error);
        }
    });

    function handleError(message: string, error: any) {
        console.error(error);
        if (axios.isAxiosError(error) && error.response) {
            vscode.window.showErrorMessage(`${message}: ${error.response.data.detail || error.message}`);
        } else {
            vscode.window.showErrorMessage(`${message}: ${error.message}`);
        }
    }

    context.subscriptions.push(
        getSuggestionDisposable,
        explainCodeDisposable,
        refactorCodeDisposable
    );
}

export function deactivate() { }
