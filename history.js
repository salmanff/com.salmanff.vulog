// vulog for freezr  - web app

var historian
freezr.initPageScripts = function() {
  historian = new History_class(historydivs, historyfuncs)
  console.log(historian)
  historian.clear_search()
}
var warningTimeOut;
var showWarning = function(msg, timing) {
    console.log("WARNING : "+msg)
    // null msg clears the message
    if (warningTimeOut) clearTimeout(warningTimeOut);
    if (!msg) {
        dg.el("warning_outer").style.display="none"
        dg.el('warnings',{clear:true})
    } else {
        let new_warning = dg.div(
          {style:{border:'1px solid grey','border-radius':'3px', 'padding':'3px', 'margin':'3px'}})
          new_warning.innerHTML=msg
        dg.el('warnings').appendChild(new_warning)
        dg.el("warning_outer").style.display="block"
        if (timing) {setTimeout(function() {
          new_warning.remove();
          if (dg.el('warnings').innerText=="") dg.el("warning_outer").style.display="none"
        },timing) }
    }
}
const historydivs = {
  main:'vulog_history_records',
  searchBox:'idSearchHistoryBox',
  searchbutton:'click_search_history',
  more_menu:'history_more'
}
const historyfuncs = {
  showWarning: showWarning,
  search: function(params, callback) {
    /* var query_params = {
        words   : ((searchTerms && searchTerms.length>0)? searchTerms.split(" "):[]),
        star_filters   : this.mark_search.star_filters,
        skip    : this.mark_search.itemsfetched,
        count   : this.mark_search.more_items,
    } */
    var q =  {'$or':[{'fj_deleted':{$exists:false}},{'fj_deleted':false}]};
    if (params.words && params.words.length>0)  {
        if (params.words.length==1) {
            q.vulog_kword2 = params.words[0];
        } else {
            var searchArray=[];
            params.words.forEach(function(anItem) {if (anItem && anItem!=" ") searchArray.push({vulog_kword2:anItem}) });
            q.$and = searchArray;
        }
    }
    console.log("query params are ",q)
    freezr.feps.postquery({'collection':'logs', q:q ,count: params.count, skip:params.skip},
      function(error, resp) {
        if (error) {
          console.warn(error)
          showWarning('there was an error doing the query')
        } else {
          // console.log(resp)
          callback(resp)
        }
      });
  },
  removeLocalItem : function (alog, callback) {
    var updatedRecord = {}
    var reservedKeys = ["_date_created","_date_modified","_public",'_id']
    for (aKey in alog) {
      updatedRecord[aKey]=reservedKeys.indexOf(aKey)<0? null:alog(aKey)
    }
    updatedRecord.fj_deleted =true;

    freezr.ceps.update(updatedRecord,{collection:'logs'},callback)
  }
}
