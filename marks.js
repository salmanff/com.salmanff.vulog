


var marks
freezr.initPageScripts = function() {
  marks = new Marker_class(markerdivs, markerfuncs)
  marks.clear_search()

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
        dg.el('click_closeWarnings').onclick=function(){showWarning();}
        if (timing) {setTimeout(function() {
          new_warning.remove();
          if (dg.el('warnings').innerText=="") dg.el("warning_outer").style.display="none"
        },timing) }
    }
}
const markerdivs = {
  main:'vulog_marks_records',
  filterstarbeg:'click_filterStar_',
  searchBox:'idSearchMarksBox',
  searchbutton:'click_search_marks',
  more_menu: 'marks_more'
}
const markerfuncs = {
  showWarning: showWarning,
  search: function(params, callback) {
    /* var query_params = {
        words   : ((searchTerms && searchTerms.length>0)? searchTerms.split(" "):[]),
        star_filters   : this.mark_search.star_filters,
        skip    : this.mark_search.itemsfetched,
        count   : this.mark_search.more_items,
    } */
    var q =  {'$or':[{'fj_deleted':{$exists:false}},{'fj_deleted':false}]};
    if (params.star_filters &&  params.star_filters.length>0) {
      if (params.star_filters.length==1) {
        q.vStars = params.star_filters[0]
      } else {
        let theAnd = []
        params.star_filters.forEach(aStar => theAnd.push({vStars:aStar}))
        q.$and = theAnd
      }
    }
    if (params.words && params.words.length>0)  {
        if (params.words.length==1) {
            q.vSearchWords = params.words[0];
        } else {
            var searchArray=[];
            params.words.forEach(function(anItem) {if (anItem && anItem!=" ") searchArray.push({vSearchWords:anItem}) });
            q.$and = searchArray;
        }
    }
    // onsole.log("query params are ",q)
    freezr.feps.postquery({'collection':'marks', q:q ,count: params.count, skip:params.skip},function(error, resp) {
      if (error) {
        console.warn(error)
        showWarning('there was an error doing the query')
      } else {
        // console.log(resp)
        console.log('old resp ', { resp })
        const newResp = markerfuncs.vp5Tranform(resp)
        console.log('new resp ', { newResp })
        callback(newResp)
      }
    });
  },
  vp5Tranform: function (markList) {
    markList.forEach((item, i) => {
      const v2Translations = {
        domain_app: 'domainApp',
        vulog_timestamp: 'vCreated',
        vulog_highlights: 'vHighlights',
        vulog_mark_notes: 'vNote',
        vulog_mark_stars: 'vStars',
        vulog_kword2: 'vSearchWords',
        vulog_source: 'vSource'
      }
      for (const [oldKey, newKey] of Object.entries(v2Translations)) {
        if (item[oldKey]) item[newKey] = item[oldKey]
        delete item[oldKey]
      }
      markList[i] = item
    })
    return markList
  },
  mark_star : async function(params, callback) {
    //{purl: this.getAttribute('purl'),id: (this.getAttribute('db_id') || this.getAttribute('fj_id')),
    //theStar:aStar, doAdd:(chosen=="unchosen")}
    console.log('async marking')
    let {purl, doAdd, id, theStar} = params
    let result = null
    let isGranted = false
    try {
      let theMark = await freepr.ceps.getById(id,{collection:'marks'})
      // onsole.log({id,theStar, theMark})
      if (theMark.purl != purl) throw new Error ('purl mismatch '+theMark.purl+' vs '+purl)
      let stars = theMark.vStars;
      if (theStar=='bullhorn') {
        isGranted = await freepr.perms.isGranted('publish_favorites')
        //  onsole.log({isGranted, doAdd})
        if (!doAdd) freepr.perms.setObjectAccess('publish_favorites', id, {action: (doAdd?'grant':'deny') , 'shared_with_group': 'public'})
        if (isGranted !== true && doAdd) {throw new Error ('permission not granted')}
      }
      let listaction = doAdd? listutils.addToListAsUniqueItems : listutils.removeFirstFromList
      stars = listaction(stars, params.theStar)
      if (!doAdd && hasNomarks(theMark)) theMark = markDeleted(theMark)
      result = await freepr.ceps.update(theMark,{'collection':'marks'})
      if (theStar=='bullhorn' && doAdd) freepr.perms.setObjectAccess('publish_favorites', id, {action: (doAdd?'grant':'deny') , 'shared_with_group': 'public'})
      callback({result,isGranted})
    } catch(error) {
      console.log('got error ', error)
      callback({ error: error, isGranted: isGranted })
    }
  }
}
const hasNomarks = function (mark){
  return (
    (!mark.vHighlights || mark.vHighlights.length==0) &&
    (!mark.vStars || mark.vStars.length==0) &&
    (!mark.vStars || mark.vStars.length==0) &&
    (!mark.vNote || mark.vNote.length==0)
         )
}
const markDeleted = function (mark){
  const KEYSTOSTAY = ['_date_modified','_date_created','_id','_owner','_accessible_By','fj_modified_locally','fj_local_temp_unique_id']
  Object.keys(mark).forEach(function(aParam) {
    if (!KEYSTOSTAY.includes(aParam)) {delete mark[aParam]}
  })
	mark.fj_deleted = true;
	return mark;
}

const listutils = {
  addToListAsUniqueItems : function(aList,items, transform) {
	// takes two lists..  integrates items into aList without duplicates
	// if items are strins or numbers, they are treated as a one item list
  	if (!aList) aList = [];
  	if (!items) return aList;
  	if (typeof items == "string" || !isNaN(items) ) items = [items];
  	if (!Array.isArray(items)) {throw new Error ("items need to be a list")}
  	if (transform) items = items.map(transform)
  	items.forEach(function(anItem) {if (anItem && anItem!=" " && aList.indexOf(anItem) < 0 && anItem.length>0) aList.push(anItem);});
  	return aList;
  },
  removeFirstFromList : function(aList,item) {
	// takes two lists..  integrates items into aList without duplicates
	// if items are strins or numbers, they are treated as a one item list
  	if (!aList) aList = [];
  	if (!item) return aList;
    let index = aList.indexOf(item)
    if (index>-1) aList.splice(index,1)
  	return aList;
  }
}
