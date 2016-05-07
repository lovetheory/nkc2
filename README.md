# nkc2
nkc community project, version 2.
currently under dev.

## License
You are allowed to use these files for any purpose, as long as you admit that they are useful.
The author of these files shall not be held responsible for any terrorist attacks or global climate changes caused by the use of these files.

## Stack
- Framework: Express 4
- Template Language: Jade (now called Pug)
- Database: ArangoDB
- Image Processing: ImageMagick
- Frontend Framework: Raw JavaScript + React (Admin Panel), need `Promise` support in browser (Does not support IE before Polyfilling)

## How to add an API

!We are currently refactoring the code.
1. (If the API is for data modification/retrieval) Visit __localhost:8529__. Learn AQL basics from ArangoDB Official Documentation. Write AQL. Test to see if your query works.
2. Implement the API function in JavaScript. See `api_experimental_operations.js`.
3. Make sure the current user has `'dev'` certificate. For users with other certificates, Modify `permissions.js`.
4. Reload Server.

## How to call an API
- In browser
  ````html
  <script src='/interface_common.js'/>
  <script>
    nkcAPI('nameOfOperation',{someParameter:'someValue'})
    .then(alert)
    .catch(alert)
  </script>
  ````

- In general

  An HTTP request should be made with cookies (for User Authentication) to `/api/experimental`, with JSON body.
  ````javascript
  {
    "operation":"nameOfOperation",
    "someParameter":"someValue"
  }
  ````

## To Get Started
1. Install Node.js, ImageMagick for your system and make sure `npm` and `convert` is available as a command from CLI.
2. `git clone` this project, or extract from zip, to somewhere nice
3. `npm update` there for the dependencies
4. Make sure ArangoDB is listening on __localhost:8529__, then run __db_restore.command__ from Finder (OS X: may need `chmod +x` first) or `sh db_restore.command` (UNIX) to load the database from JSON files
5. run __run_as_dev.bat__ or __run_as_dev.command__ to start the server in a CLI environment
6. Press **Enter** in terminal window whenever to restart server. You may also visit `server:port/reload` to do the same


## 这样开始
1. 为你的操作系统安装Node.js 和 ImageMagick，并确保 `npm` 与 `convert` 命令在命令行中可用
2. 通过 `git clone` 或者zip解压将本项目弄到某处
3. 在该处 `npm update` 以获取依赖项
4. 确保 ArangoDB 在 __localhost:8529__ 监听, 然后从Finder运行 __db_restore.command__ (OS X: 可能需要先 `chmod +x`) 或者 `sh db_restore.command` (UNIX) 以将JSON文件载入数据库
5. 运行 __run_as_dev.bat__ or __run_as_dev.command__ 以从命令行启动服务器
6. 在命令行窗口中随时按下 **Enter** 就可以重启服务器。 你也可以访问 `server:port/reload` 实现同样效果

## Recommended way to install dependencies
- ImageMagick
  - Windows

    Official Site Download.
  - OS X

    `brew install ImageMagick`
  - CentOS

    check `scripts` directory.

- ArangoDB
  - Windows

    Installer.
  - OSX

    Installer. run **ArangoDB-CLI.app** directly from **Applications**.
  - CentOS

    check `scripts` directory. Change the version number when necessary.

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
