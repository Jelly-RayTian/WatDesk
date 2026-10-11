export class SyncFence{
 private global=0;private sources=new Map<string,number>();
 capture(source:string){return `${this.global}:${this.sources.get(source)||0}`}
 current(source:string,token:string){return token===this.capture(source)}
 invalidate(source?:string){if(source)this.sources.set(source,(this.sources.get(source)||0)+1);else this.global++}
}
