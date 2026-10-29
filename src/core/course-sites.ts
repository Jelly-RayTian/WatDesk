// Course websites that only some students use. Link-only: WatDesk never reads these pages, so they need no host permission.
export interface CourseSite {id:string;code:string;name?:string;url:string}
export const courseSites:CourseSite[]=[
 {id:'cs136l',code:'CS 136L',url:'https://student.cs.uwaterloo.ca/~cs136l/'},
 {id:'cs145',code:'CS 145',url:'https://student.cs.uwaterloo.ca/~cs145/'},
 {id:'cs146',code:'CS 146',url:'https://student.cs.uwaterloo.ca/~cs146/'},
 {id:'cs234',code:'CS 234',url:'https://student.cs.uwaterloo.ca/~cs234/'},
 {id:'cs240',code:'CS 240',url:'https://student.cs.uwaterloo.ca/~cs240/'},
 {id:'cs241',code:'CS 241',name:'Foundations of Sequential Programs',url:'https://student.cs.uwaterloo.ca/~cs241/'},
 {id:'cs245',code:'CS 245',name:'Logic and Computation',url:'https://student.cs.uwaterloo.ca/~cs245/'},
 {id:'cs341',code:'CS 341',name:'Algorithms',url:'https://student.cs.uwaterloo.ca/~cs341/'},
];
export const isCourseSite=(id:unknown):id is string=>typeof id==='string'&&courseSites.some(c=>c.id===id);
