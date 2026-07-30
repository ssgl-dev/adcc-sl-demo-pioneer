_hlMenu('alerts');
function getImg () {
  var alerts = []
  $.getJSON(
          '../../data/alert.json',
          function (_data) {
            alerts = _data.Alerts
          }.bind(this)
  )
  var path = window.location.pathname
  path = path.match(/alerts-(\S*).html/)[1];
  var data = alerts.filter(function (item) {
    return item.id == path;
  })
  if ((data['thumbnail'] != undefined)) {
    return window.location.protocol+"//"+window.location.host+'/image/alerts/' + data['thumbnail'][this.getLangCode()];
  }else {
    return window.location.protocol+"//"+window.location.host+"/image/adcc_logo.png";
  }
}
window.onload = function(){
  var frameMeta = document.createElement("meta");
  frameMeta.setAttribute("property","og:url")
  frameMeta.content = window.location.href;
  var imageMeta = document.createElement("meta");
  imageMeta.setAttribute("property","og:image")
  imageMeta.content = getImg();
  var twitterUrl = document.createElement("meta");
  twitterUrl.setAttribute("property","twitter:url")
  twitterUrl.content = window.location.href;
  var twitterImage = document.createElement("meta");
  twitterImage.setAttribute("property","twitter:image")
  twitterImage.content = getImg();
  var headFa = document.getElementById("headId");
  headFa .appendChild(frameMeta);
  headFa .appendChild(imageMeta);
  headFa .appendChild(twitterUrl);
  headFa .appendChild(twitterImage);
  $("div[class=_content-view] img").each(function() {
    $(this).css("cssText", "max-width: 100% !important;");
  });
  $("div[class=_content-view] iframe").each(function() {
      var width=$(this).width();
      var clientWidth=document.body.clientWidth;
      if (width<clientWidth){
          $(this).attr('width', (width/clientWidth)*100 + "%")
      }else {
          $(this).attr('width',  "100%")
      }
  });
}