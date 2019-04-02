// 使node支持ES6：
// 1 安装依赖的npm包
// npm install --save-dev babel-cli babel-preset-env
// npm install --save-dev babel-preset-stage-0
// npm install --save-dev babel-register
// npm install --save babel-polyfill
// npm install --save bufferhelper
// 2 配置 .babelrc
/*
{
  "presets": [
    ["env", {
      "useBuiltins": true,
      "targets": {
        "node": "current"
      }
    }], "stage-0"
  ]
}
*/

require('babel-polyfill');
require('babel-register');

var fs = require('fs');
var http = require('http');
var BufferHelper = require('bufferhelper');
var fem2DataVisualizationCore = require ('./src/components/common/fem2DataVisualization/core');

var transform = fem2DataVisualizationCore.transform;

fs.unlink('./.babelrc',() => {}); // .babelrc与vue-cli配置冲突，用完即删

http.get({
  host: 'localhost',
  path: '/v2/api-docs',
  port: '8080',
  headers: {
    'Content-Type': 'application/json',
    'charset': 'UTF-8'
  }
}, function(res) {
  const bufferHelper = new BufferHelper();
  res.on("data", function(chunk){
      bufferHelper.concat(chunk);
  });
  
  res.on('end', function() {

    const swaggerApi = JSON.parse(bufferHelper.toBuffer().toString('UTF-8'));
    
    const apiList = transform.process(swaggerApi.paths)
      .fromObject('path')
      .fromStructInArray([
        {from: 'path', to: 'path'},
        {from: '1', to:'type', set:(v, item) => {
          return item.get ? 'get' : 'post'
        }},
        {from: '1', to: 'parameter', set:(v, item) => {
          return transform.toObject(((item.get || item.post || {}).parameters || []),'name');
        }},
        {from: '1', to: 'model', set:(v, item) => {
          const responses = (item.get || item.post || {}).responses;
          if (!responses) {
            return null;
          }         
          return responses[200].schema.$ref.replace('#/definitions/', '');
        }},
        {from: 'get.tags.0|post.tags.0', to: 'tag'},
        {from: 'get.description|post.description', to: 'desc', default: '-'}
      ])
      .transform({
        groupFields: ['tag'],
        valueFields: ['apiList'],
        aggregate: {
          apiList: transform.AGGREGATES.origin
        },
      })
      .operate(source => source.list)
      .toObject('tag', 'apiList')
      .output();

    const fileText1 = `/*  自动生成的文件,勿动  */\n\nexport default ${JSON.stringify(apiList, null, 2)};\n`;       
    const fileText2 = `/*  自动生成的文件,勿动  */\n\nexport default ${JSON.stringify(swaggerApi.definitions, null, 2)};\n`;
 
//  console.log(fileText2);    
//  return;
    
    fs.writeFile('./src/components/business/services/apiList.js',fileText1, 'UTF-8', function(err) {
      if(!err){
        console.log('创建apiList.js成功');
        return;
      }
      console.log(err);
    });
    
    fs.writeFile('./src/components/business/services/modelList.js',fileText2, 'UTF-8', function(err) {
      if(!err){
        console.log('创建modelList.js成功');
        return;
      }
      console.log(err);
    });


  }) 
});

 
