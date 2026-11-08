/** Draw in page coordinates so cables scroll with the article and dots stay round at every width. */
function mountBlogCables(){
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.classList.add('blog-cables');svg.setAttribute('aria-hidden','true');document.body.prepend(svg);
  const paths=[0,1].map(()=>{const path=document.createElementNS(ns,'path');path.classList.add('blog-cable');svg.append(path);return path;});
  const dots=[0,1,2,3].map((_,index)=>{const dot=document.createElementNS(ns,'circle');dot.classList.add('blog-dot');dot.setAttribute('r','4');svg.append(dot);return {dot,path:paths[index%2],phase:index*.23};});
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0;let lengths=[0,0];
  function layout(){
    const width=document.documentElement.clientWidth;const height=Math.max(document.body.scrollHeight,window.innerHeight);
    const margin=width<700?8:Math.max(12,Math.min(58,(width-1160)/4));
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    paths.forEach((path,index)=>{const edge=index?width-margin:margin;const sign=index?-1:1;const amplitude=width<700?5:Math.min(28,margin*.3);let d=`M ${edge} 70`;for(let y=70;y<height;y+=700)d+=` C ${edge+sign*amplitude} ${y+230}, ${edge-sign*amplitude} ${y+450}, ${edge} ${y+700}`;path.setAttribute('d',d);lengths[index]=path.getTotalLength();});
    if(reduced.matches)paint(0);
  }
  function paint(time){
    dots.forEach(({dot,path,phase},index)=>{const progress=reduced.matches?phase:((time/1000*(20+index*3)/lengths[index%2])+phase)%1;const point=path.getPointAtLength(lengths[index%2]*progress);dot.setAttribute('cx',point.x);dot.setAttribute('cy',point.y);});
    frame=0;if(!document.hidden&&!reduced.matches)frame=requestAnimationFrame(paint);
  }
  function resume(){if(frame)cancelAnimationFrame(frame);frame=0;if(!document.hidden)paint(performance.now());}
  new ResizeObserver(layout).observe(document.body);window.addEventListener('resize',layout);document.addEventListener('visibilitychange',resume);reduced.addEventListener('change',resume);layout();resume();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountBlogCables,{once:true});else mountBlogCables();
// Created by Sibauste System 💻
