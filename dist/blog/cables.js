/** Draw in page coordinates so cables scroll with the article and dots stay round at every width. */
function mountBlogCables(){
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  // Decap mounts its preview in the body's first child, so decorations must follow that container.
  svg.classList.add('blog-cables');svg.setAttribute('aria-hidden','true');document.body.append(svg);
  const paths=[0,1].map(()=>{const path=document.createElementNS(ns,'path');path.classList.add('blog-cable');svg.append(path);return path;});
  const dots=[0,1,2,3].map((_,index)=>{const dot=document.createElementNS(ns,'circle');dot.classList.add('blog-dot');dot.setAttribute('r','4');svg.append(dot);return {dot,path:paths[index%2],phase:index*.23};});
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0;let lengths=[0,0];
  function layout(){
    const width=document.documentElement.clientWidth;
    const regions=[...document.querySelectorAll('body > header, body > main, body > footer, .cms-preview main')];
    const bounds=regions.map(region=>region.getBoundingClientRect());
    // Size from content, not the decoration itself, so the SVG can shrink after reflow.
    const height=Math.max(window.innerHeight,...bounds.map(rect=>rect.bottom+window.scrollY));
    const gutter=bounds.length?Math.max(0,Math.min(...bounds.map(rect=>Math.min(rect.left,width-rect.right)))):20;
    const margin=Math.min(58,gutter/2);
    const amplitude=Math.min(28,Math.max(0,gutter/2-7));
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    // Match CSS and SVG coordinates explicitly; the default aspect-ratio fit can shift paths at zoom.
    svg.setAttribute('preserveAspectRatio','none');
    svg.style.width=width+'px';svg.style.height=height+'px';
    svg.style.visibility=gutter>=14?'visible':'hidden';
    paths.forEach((path,index)=>{const edge=index?width-margin:margin;const sign=index?-1:1;let d=`M ${edge} 70`;for(let y=70;y<height;y+=700)d+=` C ${edge+sign*amplitude} ${y+230}, ${edge-sign*amplitude} ${y+450}, ${edge} ${y+700}`;path.setAttribute('d',d);lengths[index]=path.getTotalLength();});
    drawDots(performance.now());
  }
  function drawDots(time){
    dots.forEach(({dot,path,phase},index)=>{const progress=reduced.matches?phase:((time/1000*(20+index*3)/lengths[index%2])+phase)%1;const point=path.getPointAtLength(lengths[index%2]*progress);dot.setAttribute('cx',point.x);dot.setAttribute('cy',point.y);});
  }
  function paint(time){
    drawDots(time);
    frame=0;if(!document.hidden&&!reduced.matches)frame=requestAnimationFrame(paint);
  }
  function resume(){if(frame)cancelAnimationFrame(frame);frame=0;if(!document.hidden)paint(performance.now());}
  const observer=new ResizeObserver(layout);observer.observe(document.body);document.querySelectorAll('header, main, footer').forEach(region=>observer.observe(region));window.addEventListener('resize',layout);window.visualViewport?.addEventListener('resize',layout);document.addEventListener('visibilitychange',resume);reduced.addEventListener('change',resume);layout();resume();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountBlogCables,{once:true});else mountBlogCables();
// Created by Sibauste System 💻
