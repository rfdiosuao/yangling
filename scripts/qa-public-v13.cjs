const {chromium}=require('playwright')
;(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:chromium.executablePath()})
 try{
 const page=await browser.newPage({viewport:{width:393,height:852}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto('https://yangling.entermodetwo.com')
 await page.getByRole('dialog',{name:'欢迎来到养令'}).waitFor({state:'detached',timeout:5000})
 await page.getByRole('button',{name:/一杯 喝/}).click()
 await page.getByText('AI 通用建议 · 未引用知识库',{exact:true}).waitFor({timeout:60000})
 await page.getByRole('button',{name:'听回答',exact:true}).waitFor()
 await page.getByRole('button',{name:'关闭',exact:true}).click()
 await page.getByRole('button',{name:'问答知识库',exact:true}).click()
 await page.getByRole('textbox',{name:'输入你想问的问题'}).fill('隔夜茶能喝吗')
 await page.getByRole('button',{name:'发送问题'}).click()
 await page.getByRole('button',{name:/知识依据 1/}).waitFor({timeout:60000})
 if(errors.length)throw new Error(errors.join('\n'))
 console.log('PASS: production cover, live AI card, read control, grounded question with one source')
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)})
