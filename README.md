# nkc2
nkc community project, version 2.
currently under dev.

## Todos
在nkc_render.js中，markdown 被 commonmark parse 成 html之后，经过若干正则表达式，得到最终输出。
例如，\\[r=123\\]表示图片附件，编号123。会被渲染成一张图片。但是目前加载此资源未必返回图片（如果资源是rar一样会response），应在服务端加入mime类型检查。
又例如，\\[rt=123\\]\\[filename.ext/\\]表示点击下载附件，编号123。会被渲染成 缩略图+文件名的形式。适合插入文章内部。
现在尚缺几种新的标记，例如[audio=123] [video=123]等等。它们应该被渲染成合适的播放器。
另外这些标记和现有markdown有冲突，应参考discourse项目解决方案。
另外，也需要引入诸如[smiles=331/]，以及$$latex-code$$这样的标签。总而言之，还有很多工作要做。

## License
You are allowed to use these files for any purpose, as long as you admit that they are useful.
The author of these files shall not be held responsible for any terrorist attacks or global climate changes caused by the use of these files.


## What it does/ How it works
- serves static files
- render then serve .jade files
- ...if paths are properly routed with express
- exposes RESTful APIs
- document storage and query using ArangoDB
- uses socket.io for real-time notifications
- upload and download of attachments
- manipulate the images uploaded for various uses


## This may be an example for those new to Node.js and express

## To Get Started
1. Install Node.js, ImageMagick for your system and make sure `npm` and `convert` is available as a command from CLI.
2. `git clone` this project, or extract from zip, to somewhere nice
3. `npm update` there for the dependencies
4. Make sure ArangoDB is listening on __localhost:8529__, then run __db_restore.command__ from Finder (OS X: may need `chmod +x` first) or `sh db_restore.command` (UNIX) to load the database from JSON files
5. run __run_as_dev.bat__ or __run_as_dev.command__ to start the server in a CLI environment
6. Press **Enter** in terminal window whenever to restart server. You may also visit `server:port/reload` to do the same


## 讲国语啦
1. 为你的操作系统安装Node.js 和 ImageMagick，并确保 `npm` 与 `convert` 命令在命令行中可用
2. 通过 `git clone` 或者zip解压将本项目弄到某处
3. 在该处 `npm update` 以获取依赖项
4. 确保 ArangoDB 在 __localhost:8529__ 监听, 然后从Finder运行 __db_restore.command__ (OS X: 可能需要先 `chmod +x`) 或者 `sh db_restore.command` (UNIX) 以将JSON文件载入数据库
5. 运行 __run_as_dev.bat__ or __run_as_dev.command__ 以从命令行启动服务器
6. 在命令行窗口中随时按下 **Enter** 就可以重启服务器。 你也可以访问 `server:port/reload` 实现同样效果

## Recommended way to install dependencies
- ImageMagick
  - Windows
    - Official Site Download.
  - OS X
    - `brew install ImageMagick`
  - CentOS
    - check `scripts` directory.

- ArangoDB
  - Windows
    - Installer.
  - OSX
    - Installer. run **ArangoDB-CLI.app** directly from **Applications**.
  - CentOS
    - check `scripts` directory. Change the version number when necessary.

## For your convenience
- `scripts` directory contains various scripts to accelerate deployment
- by default listens on __localhost:1086__
- `server_settings.js` includes several globally used server parameters and static serving routes and URL rewrites
- GET `server:port/html/jade/somename` will respond with rendered `/nkc_modules/jade/somename.jade`
- Every unrouted path will end up returning 404.jade
- `markdown`, `bbcode` and `plain` is available as filters when rendering .jade files using `require('jaderender')(filename,options)`.
- `query_functions.js` is the database wrapper
- `api_functions.js` contains all the API functions. They are called before serving API/HTML requests
- `whatever_handlers.js` contains route endpoints, in the form of __Express__ middlewares
- `im_functions.js` contains wrapper for ImageMagick binaries.
