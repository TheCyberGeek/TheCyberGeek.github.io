'use strict';
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TCGRoomWindow = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  // Glass and foreground silhouettes traced against lab-room-grey-beard.png.
  // Coordinates use the artwork's 1672 x 941 plane, with a small inset from
  // the painted frame and a margin around leaves to prevent bright edge bleed.
  const panes = [
    [[294,58],[379,70],[377,313],[297,310]],
    [[411,75],[512,88],[513,317],[410,314]],
    [[537,93],[631,106],[630,318],[535,317]]
  ];
  const foreground = [
    // Vine hanging over the upper-left pane beside the server rack.
    [[283,86],[303,93],[315,109],[315,139],[311,151],[316,161],
      [309,181],[302,190],[296,216],[285,218]],
    // Left sill plant and the leaves trailing down from its pot.
    [[282,280],[300,272],[309,267],[322,268],[331,275],[328,285],
      [340,289],[347,299],[342,310],[352,321],[354,341],[282,341]],
    // Plant straddling the first vertical divider.
    [[360,310],[368,297],[378,296],[384,286],[394,284],[401,287],
      [410,283],[419,288],[421,295],[432,300],[431,313],[426,344],[367,346]],
    // The two plants at the right end of the sill.
    [[550,312],[555,302],[568,291],[580,292],[585,299],[597,299],
      [600,290],[612,290],[618,277],[626,270],[633,279],[635,286],
      [648,279],[660,285],[670,307],[668,346],[550,346]]
  ];
  function clip(ctx, width, height) {
    function polygon(points) {
      points.forEach(([x,y],i) => ctx[i ? 'lineTo' : 'moveTo'](x*width/1672,y*height/941));
      ctx.closePath();
    }
    ctx.beginPath();
    panes.forEach(polygon);
    ctx.clip();
    // Intersect each subtraction separately so overlapping silhouettes never
    // open a hole through one another under the even-odd fill rule.
    foreground.forEach(points => {
      ctx.beginPath();
      ctx.rect(0,0,width,height);
      polygon(points);
      ctx.clip('evenodd');
    });
  }
  return {clip, panes, foreground};
});
