// Uses sharp from the developer's installed tooling (or NODE_PATH).
const sharp = require('sharp')
const fs = require('node:fs/promises')
const path = require('node:path')
const root = path.resolve(__dirname,'..')
async function main(){
  const svg=await fs.readFile(path.join(root,'public/icons/brand.svg'))
  for(const size of [180,192,512])await sharp(svg).resize(size,size).png().toFile(path.join(root,`public/icons/icon-${size}.png`))
  for(const [density,size,foreground] of [['mdpi',48,108],['hdpi',72,162],['xhdpi',96,216],['xxhdpi',144,324],['xxxhdpi',192,432]]){
    const dir=path.join(root,`android/app/src/main/res/mipmap-${density}`)
    for(const name of ['ic_launcher','ic_launcher_round'])await sharp(svg).resize(size,size).png().toFile(path.join(dir,`${name}.png`))
    const art=await sharp(svg).resize(Math.round(foreground*.7),Math.round(foreground*.7)).png().toBuffer()
    await sharp({create:{width:foreground,height:foreground,channels:4,background:'#fafbf8'}}).composite([{input:art,gravity:'centre'}]).png().toFile(path.join(dir,'ic_launcher_foreground.png'))
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1})
