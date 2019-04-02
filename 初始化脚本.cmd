:: 1 安装依赖的npm包
:: npm install --save-dev babel-cli babel-preset-env
:: npm install --save-dev babel-preset-stage-0
:: npm install --save-dev babel-register
:: npm install --save babel-polyfill
:: npm install --save bufferhelper

:: 2 配置 .babelrc
:: {
::   "presets": [
::     "env",
::     "stage-0"
::   ]
:: }

:: 3 运行我
@echo off
cd %~dp0
echo powershell.exe -NoExit  -Command "cd %~dp0 | npm start" > 运行npmStart.cmd
set babelrc={"presets":[["env",{"useBuiltins":true,"targets":{"node":"current"}}],"stage-0"]}
set createApiList= cd %~dp0 ^^^&^^^& echo %babelrc% ^^^> .babelrc ^^^&^^^&  node createApiList.js  ^^^&^^^& pause
echo %createApiList% > 创建ApiInfo.cmd
echo 创建完成：运行npmStart.cmd、创建ApiInfo.cmd
pause