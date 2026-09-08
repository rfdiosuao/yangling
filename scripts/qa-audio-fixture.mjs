// Disposable two-second WAV for local upload/playback QA, never a production track.
import {writeFile} from 'node:fs/promises'
const samples=16000*2, wav=Buffer.alloc(44+samples*2)
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples*2,40)
for(let i=0;i<samples;i++)wav.writeInt16LE(Math.round(Math.sin(i/16000*Math.PI*2*220)*800*Math.sin(i/samples*Math.PI)),44+i*2)
await writeFile('.tmp-qa-tone.wav',wav)
