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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function activate(context) {
    const backendUrl = vscode.workspace.getConfiguration('aiCodeAssistant').get('backendUrl', 'http://localhost:8000');
    async function getProjectContext() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders)
            return '';
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
                const suggestionDoc = await vscode.workspace.openTextDocument({
                    content: response.data.suggestion,
                    language: editor.document.languageId
                });
                await vscode.window.showTextDocument(suggestionDoc);
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
                    request_type: 'explain'
                });
                const outputChannel = vscode.window.createOutputChannel('AI Code Explanation');
                outputChannel.appendLine('Code Explanation:');
                outputChannel.appendLine(response.data.suggestion);
                outputChannel.show();
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
                    request_type: 'refactor'
                });
                const refactoredDoc = await vscode.workspace.openTextDocument({
                    content: response.data.suggestion,
                    language: editor.document.languageId
                });
                await vscode.window.showTextDocument(refactoredDoc);
            });
        }
        catch (error) {
            handleError('Failed to refactor code', error);
        }
    });
    function handleError(message, error) {
        console.error(error);
        if (axios_1.default.isAxiosError(error) && error.response) {
            vscode.window.showErrorMessage(`${message}: ${error.response.data.detail || error.message}`);
        }
        else {
            vscode.window.showErrorMessage(`${message}: ${error.message}`);
        }
    }
    context.subscriptions.push(getSuggestionDisposable, explainCodeDisposable, refactorCodeDisposable);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
