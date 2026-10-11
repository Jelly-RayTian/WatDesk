import {it,expect} from 'vitest';
import {retainIncomplete} from '../src/adapters/partial';
import type {Entry} from '../src/domain';
const old={id:'learn:1',platform:'learn',course:'CS 135',title:'A04',type:'task',due:null,start:null,end:null,status:'open',url:'',readerCourseId:'1',seenIn:['dropbox']} as Entry;
it('keeps old rows for failed Learn tools but removes rows from tools fully read',()=>{expect(retainIncomplete([old],[],new Map([['1',new Set(['quizzes'])]]))).toHaveLength(1);expect(retainIncomplete([old],[],new Map([['1',new Set(['dropbox'])]]))).toHaveLength(0)});
it('new records replace stale copies even in a partial tool read',()=>{expect(retainIncomplete([old],[{...old,title:'Updated'}],new Map())).toEqual([{...old,title:'Updated'}])});
