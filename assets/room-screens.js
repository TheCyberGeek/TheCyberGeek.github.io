/* Only the changing Discord conversation is projected. Static screens are baked in. */
(() => {
  const world=document.querySelector('.room-world');
  const layer=document.querySelector('.discord-animation');
  if(!world||!layer||!window.TCGScreenPerspective)return;
  const corners=[[966,382],[1157,395],[1150,544],[962,520]];
  const foreground=[[966,382],[1157,395],[1154,450],[1149,450],[1148,456],
    [1153,460],[1153,468],[1148,469],[1144,476],[1145,481],[1152,484],
    [1148,489],[1139,488],[1130,494],[1130,499],[1135,501],[1146,497],
    [1149,499],[1146,506],[1139,508],[1136,513],[1130,514],[1126,523],
    [1131,525],[1141,521],[1148,518],[1149,526],[1150,544],[962,520]];
  layer.style.clipPath=`polygon(${foreground.map(([x,y])=>`${x/1672*100}% ${y/941*100}%`).join(',')})`;
  function fit(){
    const sx=world.clientWidth/1672,sy=world.clientHeight/941;
    layer.querySelector('canvas').style.transform=`matrix3d(${window.TCGScreenPerspective(1000,750,corners.map(([x,y])=>[x*sx,y*sy])).join(',')})`;
  }
  fit();new ResizeObserver(fit).observe(world);
})();
