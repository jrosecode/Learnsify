const escape=value=>String(value||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
export function assignmentCalendar(assignment,title){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(assignment.due_at||''))throw Error('This assignment has no due date');
 const date=new Date(assignment.due_at+'T00:00:00Z');if(Number.isNaN(+date)||date.toISOString().slice(0,10)!==assignment.due_at)throw Error('Invalid due date');
 const day=assignment.due_at.replaceAll('-',''),next=new Date(+date+86400000).toISOString().slice(0,10).replaceAll('-','');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Pathira//Assignments//EN','BEGIN:VEVENT','UID:'+escape(assignment.id)+'@pathira.com','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z/,'Z'),'DTSTART;VALUE=DATE:'+day,'DTEND;VALUE=DATE:'+next,'SUMMARY:'+escape('Complete: '+title),'DESCRIPTION:Open Pathira to complete this assignment.','URL:https://pathira.com/','BEGIN:VALARM','TRIGGER:-PT24H','ACTION:DISPLAY','DESCRIPTION:Pathira assignment due tomorrow','END:VALARM','END:VEVENT','END:VCALENDAR'];
 // Fold by UTF-8 octets without splitting characters (RFC 5545).
 return lines.map(line=>{let out='',width=0;for(const char of line){const size=new TextEncoder().encode(char).length;if(width+size>73){out+='\r\n ';width=1}out+=char;width+=size}return out}).join('\r\n')+'\r\n';
}
