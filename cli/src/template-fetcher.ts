/**
 * 模板拉取模块
 * Trace ID: 3fa1a6338e5d49ac94d068385a8ebe96
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import { execSync } from 'node:child_process';
import https from 'node:https';
import tar from 'tar';
import ora, { type Ora } from 'ora';

const TEMPLATE_REPO_URL =
  'https://github.com/Moxin-x/opencode-harness-template/archive/refs/heads/main.tar.gz';
const TEMPLATE_GIT_URL =
  'https://github.com/Moxin-x/opencode-harness-template.git';

/** 创建临时目录 */
function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-harness-'));
}

/** 使用 https 下载文件到指定路径 */
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const fileStream = createWriteStream(destPath);
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          // Handle redirects
          if (
            response.statusCode &&
            response.statusCode >= 300 &&
            response.statusCode < 400 &&
            response.headers.location
          ) {
            fileStream.close();
            downloadFile(response.headers.location, destPath)
              .then(resolve)
              .catch(reject);
            return;
          }
          fileStream.close();
          reject(
            new Error(
              `下载失败，HTTP ${response.statusCode ?? '未知状态码'}`,
            ),
          );
          return;
        }
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
      })
      .on('error', (err) => {
        fileStream.close();
        reject(err);
      });
  });
}

/** 策略1：从 GitHub 下载 tarball 并解压 */
async function fetchViaTarball(
  destDir: string,
  spinner: Ora,
): Promise<string> {
  const tarballPath = path.join(destDir, 'template.tar.gz');

  spinner.text = '正在下载模板压缩包...';
  await downloadFile(TEMPLATE_REPO_URL, tarballPath);
  spinner.text = '正在解压模板...';

  // 解压到临时目录
  await tar.extract({
    file: tarballPath,
    cwd: destDir,
  });

  // 解压后目录名格式：opencode-harness-template-main
  const extractedDir = path.join(destDir, 'opencode-harness-template-main');

  if (!fs.existsSync(extractedDir)) {
    // 尝试查找解压后的唯一子目录
    const entries = fs.readdirSync(destDir);
    const dirEntry = entries.find((entry) => {
      const fullPath = path.join(destDir, entry);
      return fs.statSync(fullPath).isDirectory() && entry !== 'template.tar.gz';
    });
    if (dirEntry) {
      return path.join(destDir, dirEntry);
    }
    throw new Error('无法找到解压后的模板目录');
  }

  return extractedDir;
}

/** 策略2（回退）：使用 git clone */
async function fetchViaGit(
  destDir: string,
  spinner: Ora,
): Promise<string> {
  spinner.text = '正在通过 git 克隆模板...';
  const cloneDir = path.join(destDir, 'template');

  try {
    execSync(
      `git clone --depth 1 ${TEMPLATE_GIT_URL} "${cloneDir}"`,
      { stdio: 'pipe', timeout: 120000 },
    );
  } catch {
    throw new Error(
      'git clone 失败。请确保已安装 git 且网络连接正常。',
    );
  }

  return cloneDir;
}

/**
 * 拉取 opencode-harness-template 模板
 * @param targetDir 目标目录（暂未使用，保留给后续扩展）
 * @returns 解压后的模板文件所在目录路径
 */
export async function fetchTemplate(targetDir: string): Promise<string> {
  const tempDir = createTempDir();
  const spinner = ora('正在准备拉取模板...').start();

  try {
    // 优先尝试 tarball 方式
    const templatePath = await fetchViaTarball(tempDir, spinner);
    spinner.succeed('模板拉取成功');
    return templatePath;
  } catch (tarballError) {
    const tarballMessage =
      tarballError instanceof Error
        ? tarballError.message
        : String(tarballError);
    spinner.warn(`tarball 下载失败：${tarballMessage}`);
    spinner.info('尝试通过 git clone 回退...');

    // 回退到 git clone
    try {
      const templatePath = await fetchViaGit(tempDir, spinner);
      spinner.succeed('模板拉取成功（通过 git clone）');
      return templatePath;
    } catch (gitError) {
      spinner.fail('模板拉取失败');
      throw new Error(
        '无法拉取模板。请检查网络连接，或手动克隆：' +
          `git clone --depth 1 ${TEMPLATE_GIT_URL}`,
      );
    }
  }
}
