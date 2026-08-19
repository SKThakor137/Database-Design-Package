/**
 * SchemaGraph VS Code / Cursor / Windsurf & Antigravity IDE Extension
 * Zero external dependencies - Instant live database schema & ERD visualizer.
 */

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

// Require core schemagraph engine
let schemagraph;
try {
    schemagraph = require('../src/index');
} catch (e) {
    try {
        schemagraph = require('schemagraph');
    } catch (err) {
        schemagraph = null;
    }
}

let currentPanel = undefined;
let statusBarItem = undefined;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    // 1. Status Bar Item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'schemagraph.openPreview';
    statusBarItem.text = '$(type-hierarchy) SchemaGraph';
    statusBarItem.tooltip = 'Click to open live Database ERD Diagram';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // 2. Command: Open Live ERD Visualizer
    const openPreviewCmd = vscode.commands.registerCommand('schemagraph.openPreview', (uri) => {
        const targetPath = getTargetDirectory(uri);
        if (!targetPath) return;

        const column = vscode.window.activeTextEditor
            ? vscode.ViewColumn.Beside
            : vscode.ViewColumn.One;

        if (currentPanel) {
            currentPanel.reveal(column);
            updatePreview(targetPath);
        } else {
            currentPanel = vscode.window.createWebviewPanel(
                'schemagraphPreview',
                '⚡ SchemaGraph ERD Preview',
                column,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [vscode.Uri.file(targetPath)]
                }
            );

            // Handle Webview messages
            currentPanel.webview.onDidReceiveMessage(message => {
                handleWebviewMessage(message, targetPath);
            }, null, context.subscriptions);

            currentPanel.onDidDispose(() => {
                currentPanel = undefined;
            }, null, context.subscriptions);

            updatePreview(targetPath);
        }
    });

    // 3. Command: Export All Diagram Formats
    const exportAllCmd = vscode.commands.registerCommand('schemagraph.exportAll', async (uri) => {
        const targetPath = getTargetDirectory(uri);
        if (!targetPath) return;

        try {
            const config = vscode.workspace.getConfiguration('schemagraph');
            const exportRelDir = config.get('exportDirectory', './docs');
            const exportDir = path.isAbsolute(exportRelDir) ? exportRelDir : path.join(targetPath, exportRelDir);

            if (!fs.existsSync(exportDir)) {
                fs.mkdirSync(exportDir, { recursive: true });
            }

            const schemaMap = schemagraph.parseProject(targetPath);
            const tables = Object.keys(schemaMap);

            if (tables.length === 0) {
                vscode.window.showWarningMessage('SchemaGraph: No database schema models found in workspace.');
                return;
            }

            const theme = config.get('theme', 'catppuccin');
            const title = `${path.basename(targetPath)} Database Schema`;

            // Generate assets
            fs.writeFileSync(path.join(exportDir, 'database-design.html'), schemagraph.generateHTML(schemaMap, { title, theme }));
            fs.writeFileSync(path.join(exportDir, 'database-design.svg'), schemagraph.generateSVG(schemaMap, { title, theme }));
            fs.writeFileSync(path.join(exportDir, 'database-design.dbml'), schemagraph.generateDBML(schemaMap, { title }));
            fs.writeFileSync(path.join(exportDir, 'database-design.sql'), schemagraph.generateSQL(schemaMap, { title }));
            fs.writeFileSync(path.join(exportDir, 'database-design.md'), schemagraph.generateMarkdown(schemaMap, { title }));
            fs.writeFileSync(path.join(exportDir, 'database-design.json'), schemagraph.generateJSON(schemaMap));
            fs.writeFileSync(path.join(exportDir, 'database-design.dot'), schemagraph.generateDOT(schemaMap, { title }));
            fs.writeFileSync(path.join(exportDir, 'database-schema-ai-prompt.md'), schemagraph.generateAIContext(schemaMap, { title }));

            vscode.window.showInformationMessage(`⚡ SchemaGraph: Successfully exported 8 schema formats to ${exportRelDir}/`);
        } catch (err) {
            vscode.window.showErrorMessage(`SchemaGraph Export Error: ${err.message}`);
        }
    });

    // 4. Command: Copy Token-Optimized AI Prompt
    const generateAICmd = vscode.commands.registerCommand('schemagraph.generateAIContext', async (uri) => {
        const targetPath = getTargetDirectory(uri);
        if (!targetPath) return;

        try {
            const schemaMap = schemagraph.parseProject(targetPath);
            const prompt = schemagraph.generateAIContext(schemaMap, { title: `${path.basename(targetPath)} Database Schema` });
            await vscode.env.clipboard.writeText(prompt);
            vscode.window.showInformationMessage('⚡ SchemaGraph: AI Database Prompt copied to clipboard! (Paste into ChatGPT, Gemini, Claude, Cursor)');
        } catch (err) {
            vscode.window.showErrorMessage(`SchemaGraph Error: ${err.message}`);
        }
    });

    // 5. File Watcher for Hot Live-Reload
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.{sql,prisma,graphql,gql,php,py,rb,go,java,kt,ts,js,json}');
    
    const triggerReload = () => {
        const config = vscode.workspace.getConfiguration('schemagraph');
        if (!config.get('autoReloadOnSave', true)) return;

        if (currentPanel && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            updatePreview(vscode.workspace.workspaceFolders[0].uri.fsPath);
        }
    };

    watcher.onDidChange(triggerReload);
    watcher.onDidCreate(triggerReload);
    watcher.onDidDelete(triggerReload);

    context.subscriptions.push(openPreviewCmd, exportAllCmd, generateAICmd, watcher);
}

function getTargetDirectory(uri) {
    if (uri && uri.fsPath) {
        const stats = fs.statSync(uri.fsPath);
        return stats.isDirectory() ? uri.fsPath : path.dirname(uri.fsPath);
    }
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        return vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
    vscode.window.showErrorMessage('SchemaGraph: Please open a project workspace folder first.');
    return null;
}

function updatePreview(targetPath) {
    if (!currentPanel || !schemagraph) return;

    try {
        const config = vscode.workspace.getConfiguration('schemagraph');
        const theme = config.get('theme', 'catppuccin');
        const projectName = path.basename(targetPath);

        const schemaMap = schemagraph.parseProject(targetPath);
        const tables = Object.keys(schemaMap);

        if (tables.length === 0) {
            currentPanel.webview.html = `
                <!DOCTYPE html>
                <html>
                <body style="font-family: -apple-system, sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#181825; color:#cdd6f4;">
                    <h2>⚡ SchemaGraph</h2>
                    <p style="color:#a6adc8;">No database models detected in <code>${projectName}</code>.</p>
                    <p style="color:#6c7086; font-size:13px;">Create or edit a <code>.sql</code>, <code>.prisma</code>, <code>.graphql</code>, Django model, Laravel migration, or Go struct to visualize!</p>
                </body>
                </html>
            `;
            return;
        }

        const html = schemagraph.generateHTML(schemaMap, {
            title: `${projectName} Database Architecture`,
            theme
        });

        currentPanel.webview.html = html;
    } catch (err) {
        vscode.window.showErrorMessage(`SchemaGraph Render Error: ${err.message}`);
    }
}

function handleWebviewMessage(message, targetPath) {
    if (!message || !message.type) return;

    switch (message.type) {
        case 'notify':
            vscode.window.showInformationMessage(message.text || 'SchemaGraph Action Completed');
            break;
        case 'copyText':
            if (message.text) {
                vscode.env.clipboard.writeText(message.text);
                vscode.window.showInformationMessage('Copied to clipboard!');
            }
            break;
    }
}

function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}

module.exports = {
    activate,
    deactivate
};
