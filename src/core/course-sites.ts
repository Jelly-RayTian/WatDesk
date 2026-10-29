// Course websites that only some students use. Every site is a link; `readable` ones (parsers in adapters/course-sites.ts) also become a data source.
export interface CourseSite {id:string;code:string;name?:string;url:string;readable?:boolean}
export const courseSites:CourseSite[]=[
 {id:'cs106',code:'CS 106',url:'https://student.cs.uwaterloo.ca/~cs106/'},
 {id:'cs115',code:'CS 115',url:'https://student.cs.uwaterloo.ca/~cs115/'},
 {id:'cs116',code:'CS 116',url:'https://student.cs.uwaterloo.ca/~cs116/'},
 {id:'cs136l',code:'CS 136L',url:'https://student.cs.uwaterloo.ca/~cs136l/'},
 {id:'cs145',code:'CS 145',url:'https://student.cs.uwaterloo.ca/~cs145/',readable:true},
 {id:'cs146',code:'CS 146',url:'https://student.cs.uwaterloo.ca/~cs146/'},
 {id:'cs234',code:'CS 234',url:'https://student.cs.uwaterloo.ca/~cs234/'},
 {id:'cs240',code:'CS 240',url:'https://student.cs.uwaterloo.ca/~cs240/',readable:true},
 {id:'cs241',code:'CS 241',name:'Foundations of Sequential Programs',url:'https://student.cs.uwaterloo.ca/~cs241/',readable:true},
 {id:'cs245',code:'CS 245',name:'Logic and Computation',url:'https://student.cs.uwaterloo.ca/~cs245/'},
 {id:'cs341',code:'CS 341',name:'Algorithms',url:'https://student.cs.uwaterloo.ca/~cs341/'},
 {id:'cs348',code:'CS 348',name:'Introduction to Database Systems',url:'https://student.cs.uwaterloo.ca/~cs348/'},
 {id:'cs349',code:'CS 349',url:'https://student.cs.uwaterloo.ca/~cs349/'},
 {id:'cs350',code:'CS 350',name:'Operating Systems',url:'https://student.cs.uwaterloo.ca/~cs350/'},
 {id:'cs360',code:'CS 360',name:'Introduction to the Theory of Computing',url:'https://student.cs.uwaterloo.ca/~cs360/'},
 {id:'cs371',code:'CS 371',name:'Introduction to Computational Mathematics',url:'https://student.cs.uwaterloo.ca/~cs371/'},
 {id:'cs442',code:'CS 442',url:'https://student.cs.uwaterloo.ca/~cs442/'},
 {id:'cs444',code:'CS 444',name:'Compiler Construction',url:'https://student.cs.uwaterloo.ca/~cs444/'},
 {id:'cs446',code:'CS 446',name:'Software Design and Architectures',url:'https://student.cs.uwaterloo.ca/~cs446/'},
 {id:'cs450',code:'CS 450',name:'Computer Architecture',url:'https://student.cs.uwaterloo.ca/~cs450/'},
 {id:'cs451',code:'CS 451',name:'Data-Intensive Distributed Computing',url:'https://student.cs.uwaterloo.ca/~cs451/'},
 {id:'cs466',code:'CS 466',url:'https://student.cs.uwaterloo.ca/~cs466/'},
 {id:'cs480',code:'CS 480',url:'https://student.cs.uwaterloo.ca/~cs480/'},
 {id:'cs486',code:'CS 486',name:'Introduction to Artificial Intelligence',url:'https://student.cs.uwaterloo.ca/~cs486/'},
 {id:'cs487',code:'CS 487',url:'https://student.cs.uwaterloo.ca/~cs487/'},
];
export const isCourseSite=(id:unknown):id is string=>typeof id==='string'&&courseSites.some(c=>c.id===id);
export const readableSiteIds=(enabled:readonly string[]|undefined)=>courseSites.filter(c=>c.readable&&(enabled??[]).includes(c.id)).map(c=>c.id);
