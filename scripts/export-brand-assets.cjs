// Export the exact existing vector mark for animation handoff, not a redesign.
const fs=require('node:fs/promises'),path=require('node:path'),sharp=require('sharp')
async function main(){
  const root=path.resolve(__dirname,'..'),out=path.join(root,'public/brand')
  await fs.mkdir(out,{recursive:true})
  const original=await fs.readFile(path.join(root,'public/icons/brand.svg'),'utf8')
  const paths=[...original.matchAll(/<path d="([^"]+)"\/>/g)].map((m,i)=>`<path id="${['outer-ring','inner-leaf','stem'][i]}" d="${m[1]}"/>`).join('\n')
  const stroke='fill="none" stroke="#8b6d39" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"'
  const mark=white=>`<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2048" viewBox="0 0 64 64" role="img" aria-label="养令新版图形标记">${white?'<rect id="background" width="64" height="64" fill="#ffffff"/>':''}<g id="brand-mark" transform="translate(12 12)" ${stroke}>${paths}</g></svg>`
  const lockup=white=>`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-label="养令 YangLing 新版标志">${white?'<rect id="background" width="1600" height="1000" fill="#ffffff"/>':''}<g id="brand-mark" transform="translate(600 175) scale(10)" ${stroke}>${paths}</g><g id="wordmark-cn" fill="#283e33"><text x="800" y="660" text-anchor="middle" font-family="SimSun, Songti SC, serif" font-size="130" letter-spacing="8">养令</text></g><g id="wordmark-en" fill="#66766c"><text x="800" y="750" text-anchor="middle" font-family="Georgia, serif" font-size="48" letter-spacing="4">YangLing</text></g></svg>`
  for(const [name,svg] of [['yangling-mark-white',mark(true)],['yangling-mark-transparent',mark(false)],['yangling-logo-white',lockup(true)],['yangling-logo-transparent',lockup(false)]]){
    await fs.writeFile(path.join(out,`${name}.svg`),svg+'\n')
    await sharp(Buffer.from(svg)).png().toFile(path.join(out,`${name}.png`))
  }
  console.log('Exported 4 SVG + 4 PNG assets to public/brand')
}
main().catch(e=>{console.error(e);process.exitCode=1})
