import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
	console.log('Word Count extension is now active!');

	// 创建状态栏项
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
	statusBarItem.command = 'wordcount.update';
	context.subscriptions.push(statusBarItem);

	// 创建文件夹统计状态栏项
	const folderStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
	folderStatusBarItem.command = 'wordcount.folderUpdate';
	context.subscriptions.push(folderStatusBarItem);

	// 更新当前文件统计的函数
	const updateWordCount = () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			statusBarItem.hide();
			return;
		}

		const config = vscode.workspace.getConfiguration('wordcount');
		if (!config.get<boolean>('enabled', true)) {
			statusBarItem.hide();
			return;
		}

		const document = editor.document;
		const text = document.getText();

		// 统计各种字数
		const chineseCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
		const englishCount = (text.match(/\b\w+\b/g) || []).length;
		const totalCount = text.length;

		// 构建状态栏文本
		let statusText = ' ';
		if (config.get<boolean>('showChinese', true)) {
			if (chineseCount < 1000) {
				statusText += `当前文件: ${chineseCount} `;
			} else if (chineseCount < 10000) {
				statusText += `当前文件：` + (chineseCount / 1000).toFixed(2) + `K`;
			} else {
				statusText += `当前文件：` + (chineseCount / 10000).toFixed(2) + `万`;
			}
			statusText += '  ';
		}
		if (config.get<boolean>('showEnglish', true)) {
			statusText += `英文: ${englishCount} `;
			statusText += '  ';
		}
		if (config.get<boolean>('showTotal', true)) {
			if (totalCount < 1000) {
				statusText += `总计: ${totalCount} `;
			} else if (totalCount < 10000) {
				statusText += `总计：` + (totalCount / 1000).toFixed(2) + `K`;
			} else {
				statusText += `总计：` + (totalCount / 10000).toFixed(2) + `万`;
			}
			statusText += '  ';
		}
		statusText += ' | ';

		statusBarItem.text = statusText.trim();
		statusBarItem.show();
	};

	// 更新文件夹统计的函数
	const updateFolderWordCount = async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			folderStatusBarItem.hide();
			return;
		}

		const config = vscode.workspace.getConfiguration('wordcount');
		if (!config.get<boolean>('enabled', true) || !config.get<boolean>('showFolderStats', true)) {
			folderStatusBarItem.hide();
			return;
		}

		const document = editor.document;
		const filePath = document.uri.fsPath;
		const folderPath = path.dirname(filePath);

		try {
			// 显示加载状态
			folderStatusBarItem.text = `$(loading~spin) 统计文件夹字数...`;
			folderStatusBarItem.show();

			// 获取所有文件
			const files = await getAllFilesInFolder(folderPath);

			let totalChinese = 0;
			let totalEnglish = 0;
			let totalChars = 0;
			let fileCount = 0;

			// 统计每个文件
			for (const file of files) {
				const content = fs.readFileSync(file, 'utf-8');
				totalChinese += (content.match(/[\u4e00-\u9fa5]/g) || []).length;
				totalEnglish += (content.match(/\b\w+\b/g) || []).length;
				totalChars += content.length;
				fileCount++;
			}

			// 构建状态栏文本
			let statusText = ' ';
			if (config.get<boolean>('showChinese', true)) {
				if (totalChinese < 1000) {
					statusText += `文件夹: ${totalChinese} `;
				} else if (totalChinese < 10000) {
					statusText += `文件夹：` + (totalChinese / 1000).toFixed(2) + `K`;
				} else {
					statusText += `文件夹：` + (totalChinese / 10000).toFixed(2) + `万`;
				}
				statusText += '  '; 
			}
			if (config.get<boolean>('showEnglish', true)) {
				statusText += `英文: ${totalEnglish} `;
				statusText += '  ';
			}
			if (config.get<boolean>('showTotal', true)) {
				if (totalChars < 1000) {
					statusText += `文件夹总计: ${totalChars} `;
				} else if (totalChars < 10000) {
					statusText += `文件夹总计：` + (totalChars / 1000).toFixed(2) + `K`;
				} else {
					statusText += `文件夹总计：` + (totalChars / 10000).toFixed(2) + `万`;
				}
				statusText += '  ';
			}
			statusText += `(文件数: ${fileCount})`;
			statusText += ' | ';

			folderStatusBarItem.text = statusText.trim();
			folderStatusBarItem.show();
		} catch (error) {
			console.error('统计文件夹字数时出错:', error);
			folderStatusBarItem.text = '统计文件夹字数失败';
			folderStatusBarItem.show();
		}
	};

	// 递归获取文件夹下所有文件
	const getAllFilesInFolder = async (folderPath: string): Promise<string[]> => {
		const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
		const files = await Promise.all(entries.map(entry => {
			const fullPath = path.join(folderPath, entry.name);
			return entry.isDirectory() ? getAllFilesInFolder(fullPath) : fullPath;
		}));
		return files.flat();
	};

	// 监听文档变化和编辑器切换
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			updateWordCount();
			updateFolderWordCount();
		}),
		vscode.workspace.onDidChangeTextDocument(() => {
			updateWordCount();
			updateFolderWordCount();
		})
	);

	// 添加命令
	context.subscriptions.push(
		vscode.commands.registerCommand('wordcount.update', updateWordCount),
		vscode.commands.registerCommand('wordcount.folderUpdate', updateFolderWordCount)
	);

	// 初始更新
	updateWordCount();
	updateFolderWordCount();
}

export function deactivate() { }