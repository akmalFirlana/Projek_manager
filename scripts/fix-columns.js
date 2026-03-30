const fs = require('fs');
let content = fs.readFileSync('src/app/kelola-projek/page.tsx', 'utf-8');

// Fix the incorrect hover states on tr which missed dark:hover
content = content.replace(/hover:bg-black\/5 dark:bg-white\/5/g, 'hover:bg-black/5 dark:hover:bg-white/5 focus-within:bg-black/5 dark:focus-within:bg-white/5');

// Fix the incorrect hardcoded dark:bg-white/5 inside the contentEditable inner divs
content = content.replace(/focus:bg-black\/5 dark:bg-white\/5/g, 'focus:bg-black/5 dark:focus:bg-white/5');

// Make headers resizable
content = content.replace(
  /<th className="px-4 py-2 font-normal whitespace-nowrap w-48 border-r border-black\/5 dark:border-white\/5">\s*Nama projek\s*<\/th>/g,
  '<th className="p-0 font-normal whitespace-nowrap border-r border-black/5 dark:border-white/5 align-middle border-b-0"><div className="resize-x overflow-hidden w-48 min-w-[120px] max-w-xl px-4 py-2 flex items-center h-full">Nama projek</div></th>'
);

const wrapHeader = (iconName, title) => {
  const regex = new RegExp('<th className="px-4 py-2 font-normal whitespace-nowrap(.*? border-r border-black\/5 dark:border-white\/5)">\\s*<div className="flex items-center">\\s*<'+iconName+' className="w-4 h-4 mr-2 opacity-50" />\\s*'+title+'\\s*<\\/div>\\s*<\\/th>', 'g');
  content = content.replace(
    regex,
    '<th className="p-0 font-normal whitespace-nowrap$1 align-middle border-b-0"><div className="resize-x overflow-hidden px-4 py-2 min-w-[120px] max-w-xl flex items-center h-full"><'+iconName+' className="w-4 h-4 mr-2 opacity-50" />'+title+'</div></th>'
  );
};

wrapHeader('Tag', 'Info Lain');
wrapHeader('AlignLeft', 'Penjelasan');
wrapHeader('AlignLeft', 'Progress');
wrapHeader('AlignLeft', 'Todo');
wrapHeader('AlignLeft', 'info server dll');

fs.writeFileSync('src/app/kelola-projek/page.tsx', content);
console.log('Fixed');
