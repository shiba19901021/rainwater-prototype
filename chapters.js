/* Later chapters use their own controls; the rain simulation remains independent. */
const engineeringPages={
 problem:{title:'還沒準備收水，水就往桶子走。',body:'原本較低的進桶支管，讓沿著管壁流下的水有機會直接進入水桶。這會影響「先排掉前段雨水」的安排。',notice:'光看接好了還不夠，要看水實際怎麼走。'},
 change:{title:'把進桶支管抬高，先蓄水再進桶。',body:'後來把通往水桶的支管抬高。水位必須先升到高點，才能越過這一段進入水桶；前段雨水則先從開著的底部排水閥排走。',notice:'改一個位置，是為了讓水照著需要的順序走。'},
 test:{title:'用兩種操作，確認修改有沒有用。',body:'排水閥開著時，觀察前段水是否從底部排走；關閉後，再觀察沉澱管水位是否先上升、越過高點，最後才進桶。剛才的動畫就能幫我們看懂這個先後關係。',notice:''}
};
const weatherPages={
 rain:{label:'收下一部分雨水',title:'先沖洗，再把水留下。',body:'先讓前段雨水排走，需要收水時才關閉排水閥。留下的水，可以在之後有需要時取用。',limit:'能收多少，和降雨情況、原有水位及操作方式有關。'},
 heavy:{label:'容量有限，滿了仍要排水',title:'桶滿了，多餘的水要有去處。',body:'儲水桶滿了以後，多餘雨水會從溢流管排回原有排水溝。收下部分雨水，也要維持原本的排水通暢。',limit:'一個 200 L 桶只能留下有限的水，不能把所有大雨都裝下，也不能保證解決淹水問題。'},
 dry:{label:'用的是先前存下來的水',title:'沒有新雨水，就要留意還剩多少。',body:'水桶裡的水用完後，就無法繼續供水。',limit:''}
};
function bindChapter(selector,pages,render){
 const buttons=Array.from(document.querySelectorAll(selector));
 buttons.forEach(button=>button.addEventListener('click',()=>{
  const key=button.dataset.engineering||button.dataset.weather;
  buttons.forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
  render(pages[key]);
 }));
}
const chapterText=(id,value)=>{document.getElementById(id).textContent=value};
bindChapter('[data-engineering]',engineeringPages,p=>{chapterText('engineering-title',p.title);chapterText('engineering-body',p.body);chapterText('engineering-notice',p.notice)});
bindChapter('[data-weather]',weatherPages,p=>{for(const key of ['label','title','body','limit'])chapterText('weather-'+key,p[key])});
