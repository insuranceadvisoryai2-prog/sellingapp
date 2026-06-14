import { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api.js';
import { useToast } from '../App.jsx';

const EMPTY = {
  name:'', description:'', price:'', original_price:'', discount_pct:'',
  category:'', subcategory:'', brand:'', stock:'999', unit:'piece',
  min_order:'1', source_url:'', images:'', is_published:true,
};

function fileToBase64(file) {
  return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});
}

// Build bookmarklet with importToken HARDCODED (no localStorage needed)
function buildBookmarklet(backendUrl, importToken) {
  // Written as array join to avoid any template/escape issues
  const parts = [];
  parts.push('(function(){');
  parts.push('var B="' + backendUrl + '";');
  parts.push('var T="' + importToken + '";');
  parts.push('var nd=window.__NEXT_DATA__;');
  parts.push('if(!nd){alert("Not a product page. Please open a single product detail page.");return;}');
  parts.push('function df(o,ks,d){if(!d||!o||typeof o!="object")return null;for(var i=0;i<ks.length;i++){var k=ks[i];if(o[k]!=null&&String(o[k]).trim().length>0)return o[k];}var vs=Object.values(o);for(var j=0;j<vs.length;j++){if(typeof vs[j]=="object"){var f=df(vs[j],ks,d-1);if(f!=null)return f;}}return null;}');
  parts.push('function gi(o,d,s){s=s||[];if(!d||!o||typeof o!="object")return s;var vs=Object.values(o);for(var i=0;i<vs.length;i++){var v=vs[i];if(typeof v=="string"&&v.indexOf("http")===0&&/\\.(jpg|jpeg|png|webp)/i.test(v.split("?")[0])&&s.indexOf(v.split("?")[0])===-1)s.push(v.split("?")[0]);else if(typeof v=="object")gi(v,d-1,s);}return s;}');
  parts.push('var nm=df(nd,["product_name","name","title"],12);');
  parts.push('var pr=df(nd,["current_price","selling_price","discounted_price"],12);');
  parts.push('var mr=df(nd,["mrp","original_price","market_price"],12);');
  parts.push('var de=df(nd,["description","product_description"],12);');
  parts.push('var br=df(nd,["brand_name","supplier_name","brandName"],12);');
  parts.push('var ca=df(nd,["primary_category","category_name","category"],12);');
  parts.push('var su=df(nd,["sub_category","subCategory"],12);');
  parts.push('var im=gi(nd,12,[]).filter(function(u){return u.indexOf("meesho")>-1||u.indexOf("ik.imagekit")>-1;}).slice(0,8);');
  parts.push('var p=parseFloat(String(pr||0).replace(/[^0-9.]/g,""))||0;');
  parts.push('var m=parseFloat(String(mr||0).replace(/[^0-9.]/g,""))||Math.round(p*1.25);');
  parts.push('var di=m>p?Math.round((1-p/m)*100):0;');
  parts.push('if(!nm){alert("Could not find product name. Open a product detail page (not search).");return;}');
  parts.push('var sn=String(nm).trim();');
  parts.push('if(!confirm("Product found!\\n\\nName: "+sn+"\\nPrice: Rs."+p+(m>p?" (MRP Rs."+m+", "+di+"% off)":"")+"\\nImages: "+im.length+"\\n\\nSave to your store?"))return;');
  parts.push('var pl={name:sn,description:String(de||"").trim(),price:p,original_price:m,discount_pct:di,images:im,image_url:im[0]||"",category:String(ca||"Wholesale").trim(),subcategory:String(su||"").trim(),brand:String(br||"").trim(),source_url:window.location.href};');
  parts.push('fetch(B+"/api/admin/import-product",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+T},body:JSON.stringify(pl)}).then(function(r){return r.json();}).then(function(d){if(d.success){alert("Saved! Go to Pending tab to approve.");}else{alert("Error: "+d.error);}}).catch(function(e){alert("Failed: "+e.message);});');
  parts.push('})();');
  const code = parts.join('');
  return 'javascript:' + encodeURIComponent(code);
}

export default function AdminDashboard() {
  const [tab, setTab]                   = useState('import');
  const [allProducts, setAllProducts]   = useState([]);
  const [pendingProducts, setPending]   = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [jobs, setJobs]                 = useState([]);
  const [loading, setLoading]           = useState(false);
  const [showForm, setShowForm]         = useState(false);
  const [editingProduct, setEditing]    = useState(null);
  const [form, setForm]                 = useState(EMPTY);
  const [saving, setSaving]             = useState(false);
  const [deviceImages, setDeviceImages] = useState([]);
  const [urlImagePreview, setUrlPreview]= useState([]);
  const [approvingAll, setApprovingAll] = useState(false);
  const [importToken, setImportToken]   = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const fileInputRef = useRef();
  const toast = useToast();

  const BACKEND = window.location.origin;

  const loadPending = () => api.adminGetProducts(1,'pending').then(setPending).catch(()=>{});
  const loadAll     = () => { setLoading(true); api.adminGetProducts(1,'').then(setAllProducts).finally(()=>setLoading(false)); };
  const loadCount   = () => api.adminPendingCount().then(r=>setPendingCount(r.count)).catch(()=>{});
  const loadJobs    = () => api.adminScrapeJobs().then(setJobs).catch(()=>{});
  useEffect(()=>{ loadPending(); loadAll(); loadCount(); loadJobs(); },[]);

  useEffect(()=>{
    const urls = form.images?form.images.split(',').map(s=>s.trim()).filter(Boolean):[];
    setUrlPreview(urls);
  },[form.images]);

  const generateToken = async () => {
    setTokenLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { toast('❌ Not logged in'); return; }
      const res = await fetch('/api/admin/generate-import-token', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
      });
      const d = await res.json();
      if (d.token) {
        setImportToken(d.token);
        toast('✅ Bookmarklet ready! Now drag the red button to your bookmarks bar.');
      } else {
        toast('❌ ' + (d.error || 'Failed to generate token'));
      }
    } catch(e) { toast('❌ ' + e.message); }
    finally { setTokenLoading(false); }
  };

  const openAddForm = (prefill={}) => {
    setEditing(null);
    const urlImgs = Array.isArray(prefill.images)?prefill.images.filter(u=>u&&!u.startsWith('data:')):[];
    const b64Imgs = Array.isArray(prefill.images)?prefill.images.filter(u=>u&&u.startsWith('data:')):[];
    setForm({...EMPTY,...prefill, images:urlImgs.join(', ')});
    setDeviceImages(b64Imgs);
    setShowForm(true); window.scrollTo(0,0);
  };
  const openEditForm = (p) => {
    setEditing(p);
    const imgs = Array.isArray(p.images)?p.images.filter(i=>i&&!i.startsWith('data:')):[];
    setForm({ name:p.name||'', description:p.description||'', price:p.price||'', original_price:p.original_price||'',
      discount_pct:p.discount_pct||'', category:p.category||'', subcategory:p.subcategory||'', brand:p.brand||'',
      stock:p.stock||'999', unit:p.unit||'piece', min_order:p.min_order||'1', source_url:p.source_url||'',
      images:imgs.join(', '), is_published:p.is_published!==false });
    setDeviceImages(Array.isArray(p.images)?p.images.filter(i=>i&&i.startsWith('data:')):[]);
    setShowForm(true); setTab('products'); window.scrollTo(0,0);
  };

  const handleFormChange = (e)=>{const{name,value,type,checked}=e.target;setForm(f=>({...f,[name]:type==='checkbox'?checked:value}));};
  const handleDeviceImages = async(e)=>{
    const files=Array.from(e.target.files);if(!files.length)return;
    const b64s=await Promise.all(files.map(fileToBase64));
    setDeviceImages(prev=>[...prev,...b64s]);toast(`✅ ${files.length} image(s) added`);
  };
  const allImages=[...deviceImages,...urlImagePreview];

  const saveProduct = async()=>{
    if(!form.name.trim()){toast('❌ Product name required');return;}
    if(!form.price||isNaN(form.price)){toast('❌ Valid price required');return;}
    setSaving(true);
    try{
      const urlImgs=form.images?form.images.split(',').map(s=>s.trim()).filter(Boolean):[];
      const payload={...form,price:parseFloat(form.price),
        original_price:form.original_price?parseFloat(form.original_price):parseFloat(form.price),
        discount_pct:parseInt(form.discount_pct)||0, stock:parseInt(form.stock)||999,
        min_order:parseInt(form.min_order)||1, images:[...deviceImages,...urlImgs],
        image_url:deviceImages[0]||urlImgs[0]||'', approval_status:'approved', is_published:form.is_published};
      if(editingProduct){await api.adminUpdateProduct(editingProduct.id,payload);toast('✅ Updated!');}
      else{await api.adminCreateProduct(payload);toast('✅ Product added!');}
      setShowForm(false);setEditing(null);setForm(EMPTY);setDeviceImages([]);
      loadAll();loadCount();
    }catch(err){toast('❌ '+err.message);}finally{setSaving(false);}
  };

  const approve=async(id)=>{await api.adminApprove(id);toast('✅ Approved & live!');loadPending();loadAll();loadCount();};
  const reject=async(id)=>{await api.adminReject(id);toast('⛔ Rejected');loadPending();loadAll();loadCount();};
  const approveAll=async()=>{
    if(!confirm(`Approve all ${pendingCount} products?`))return;
    setApprovingAll(true);
    try{const r=await api.adminApproveAll();toast(`✅ ${r.approved} live!`);loadPending();loadAll();loadCount();}
    catch{toast('❌ Failed');}finally{setApprovingAll(false);}
  };
  const deleteProduct=async(id,name)=>{if(!confirm(`Delete "${name}"?`))return;await api.adminDeleteProduct(id);toast('🗑 Deleted');loadAll();loadCount();};
  const togglePublish=async(p)=>{await api.adminUpdateProduct(p.id,{is_published:!p.is_published});toast(p.is_published?'⛔ Hidden':'✅ Live');loadAll();};

  const L={fontWeight:600,fontSize:13,display:'block',marginBottom:6,color:'#424242'};
  const I={width:'100%',padding:'11px 14px',border:'1px solid #e0e0e0',borderRadius:8,fontSize:14,fontFamily:'inherit',outline:'none'};

  const tabs=[
    {key:'import',label:'⚡ Import'},
    {key:'pending',label:pendingCount>0?`⏳ Pending (${pendingCount})`:'⏳ Pending'},
    {key:'products',label:`📦 Products (${allProducts.length})`},
  ];

  const bookmarklet = importToken ? buildBookmarklet(BACKEND, importToken) : '#';

  return (
    <div className="container" style={{padding:'24px 16px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:800}}>🛠 Admin Dashboard</h1>
        {pendingCount>0&&<span style={{background:'#e53935',color:'white',padding:'5px 14px',borderRadius:20,fontSize:13,fontWeight:700,cursor:'pointer'}} onClick={()=>setTab('pending')}>🔔 {pendingCount} pending</span>}
      </div>

      {/* FORM */}
      {showForm&&(
        <div style={{background:'white',borderRadius:12,padding:24,marginBottom:24,boxShadow:'0 4px 20px rgba(0,0,0,0.12)',border:'2px solid #e53935'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <h2 style={{fontWeight:800,fontSize:18}}>{editingProduct?'✏️ Edit Product':'➕ Add Product'}</h2>
            <button onClick={()=>{setShowForm(false);setEditing(null);setDeviceImages([]);}} style={{background:'#f5f5f5',border:'none',borderRadius:8,padding:'7px 14px',cursor:'pointer',fontWeight:700}}>✕</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div style={{gridColumn:'1/-1'}}><label style={L}>Product Name *</label><input name="name" value={form.name} onChange={handleFormChange} placeholder="e.g. Stainless Steel Lunch Box" style={I}/></div>
            <div style={{gridColumn:'1/-1'}}><label style={L}>Description</label><textarea name="description" value={form.description} onChange={handleFormChange} placeholder="Full product description..." rows={3} style={{...I,resize:'vertical'}}/></div>
            <div><label style={L}>Selling Price (₹) *</label><input name="price" type="number" value={form.price} onChange={handleFormChange} placeholder="299" style={I}/></div>
            <div><label style={L}>Original / MRP (₹)</label><input name="original_price" type="number" value={form.original_price} onChange={handleFormChange} placeholder="499" style={I}/></div>
            <div><label style={L}>Category</label><input name="category" value={form.category} onChange={handleFormChange} placeholder="Kitchenware, Clothing..." style={I}/></div>
            <div><label style={L}>Brand / Supplier</label><input name="brand" value={form.brand} onChange={handleFormChange} placeholder="e.g. Bear Family" style={I}/></div>
            <div><label style={L}>Stock</label><input name="stock" type="number" value={form.stock} onChange={handleFormChange} style={I}/></div>
            <div><label style={L}>Unit</label><select name="unit" value={form.unit} onChange={handleFormChange} style={I}>{['piece','pieces','set','dozen','kg','gram','meter','litre','box','pack','bundle'].map(u=><option key={u} value={u}>{u}</option>)}</select></div>
            <div><label style={L}>Min Order Qty</label><input name="min_order" type="number" value={form.min_order} onChange={handleFormChange} style={I}/></div>
            <div><label style={L}>Subcategory</label><input name="subcategory" value={form.subcategory} onChange={handleFormChange} style={I}/></div>
            <div style={{gridColumn:'1/-1'}}><label style={L}>🔗 Source Link <span style={{color:'#e53935',fontSize:11,fontWeight:400}}>(Admin only)</span></label><input name="source_url" value={form.source_url} onChange={handleFormChange} placeholder="https://www.meesho.com/..." style={{...I,borderColor:'#ff6f00'}}/></div>
            <div style={{gridColumn:'1/-1'}}>
              <label style={L}>📱 Upload Images from Device</label>
              <div onClick={()=>fileInputRef.current?.click()} style={{border:'2px dashed #e0e0e0',borderRadius:8,padding:14,textAlign:'center',cursor:'pointer',background:'#fafafa'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='#e53935';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#e0e0e0';}}>
                <div style={{fontSize:24,marginBottom:3}}>📷</div>
                <p style={{fontWeight:600,fontSize:13}}>Click to upload images</p>
                <p style={{fontSize:11,color:'#757575'}}>JPG PNG WEBP · multiple files ok</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleDeviceImages} style={{display:'none'}}/>
            </div>
            <div style={{gridColumn:'1/-1'}}><label style={L}>🌐 Image URLs (comma-separated)</label><textarea name="images" value={form.images} onChange={handleFormChange} placeholder="https://img1.jpg, https://img2.jpg" rows={2} style={{...I,resize:'vertical'}}/></div>
            {allImages.length>0&&(
              <div style={{gridColumn:'1/-1'}}>
                <label style={L}>Preview ({allImages.length} images)</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {allImages.map((url,i)=>(
                    <div key={i} style={{position:'relative'}}>
                      <img src={url} alt="" style={{width:80,height:80,objectFit:'cover',borderRadius:8,border:i===0?'3px solid #e53935':'1px solid #e0e0e0'}} onError={e=>{e.target.style.opacity='0.3';}}/>
                      {i===0&&<span style={{position:'absolute',bottom:2,left:2,background:'#e53935',color:'white',fontSize:8,padding:'1px 4px',borderRadius:4,fontWeight:700}}>MAIN</span>}
                      {url.startsWith('data:')&&<button onClick={()=>setDeviceImages(d=>d.filter(x=>x!==url))} style={{position:'absolute',top:-5,right:-5,background:'#e53935',color:'white',border:'none',borderRadius:'50%',width:16,height:16,fontSize:9,cursor:'pointer',fontWeight:700}}>✕</button>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:10}}>
              <input type="checkbox" name="is_published" checked={form.is_published} onChange={handleFormChange} id="pub" style={{width:16,height:16}}/>
              <label htmlFor="pub" style={{fontWeight:600,cursor:'pointer',fontSize:14}}>Publish immediately (skip pending review)</label>
            </div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20,justifyContent:'flex-end'}}>
            <button onClick={()=>{setShowForm(false);setEditing(null);setDeviceImages([]);}} style={{padding:'11px 22px',borderRadius:8,border:'1px solid #e0e0e0',background:'white',fontWeight:600,cursor:'pointer'}}>Cancel</button>
            <button onClick={saveProduct} disabled={saving} style={{padding:'11px 28px',borderRadius:8,background:'#e53935',color:'white',fontWeight:700,border:'none',cursor:'pointer',fontSize:15}}>{saving?'⏳ Saving...':editingProduct?'✅ Update':'➕ Add Product'}</button>
          </div>
        </div>
      )}

      {/* TABS */}
      <div style={{display:'flex',gap:4,marginBottom:20,borderBottom:'2px solid #e0e0e0'}}>
        {tabs.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} style={{padding:'9px 16px',border:'none',background:'none',fontWeight:700,fontSize:13,cursor:'pointer',color:tab===t.key?'#e53935':'#757575',borderBottom:tab===t.key?'2px solid #e53935':'2px solid transparent',marginBottom:-2}}>{t.label}</button>
        ))}
      </div>

      {/* ── IMPORT TAB ── */}
      {tab==='import'&&(
        <div style={{maxWidth:680}}>

          {/* STEP 1: Generate token */}
          <div style={{background:'white',borderRadius:12,padding:24,marginBottom:16,boxShadow:'0 2px 8px rgba(0,0,0,0.08)',border:'1px solid #e0e0e0'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
              <span style={{background:'#e53935',color:'white',width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:14,flexShrink:0}}>1</span>
              <h3 style={{fontWeight:800,fontSize:16}}>Generate Your Personal Bookmarklet</h3>
            </div>
            <p style={{fontSize:13,color:'#555',marginBottom:16,lineHeight:1.6}}>
              Click the button to generate a bookmarklet with your login token embedded. This solves the domain restriction problem — no manual token needed.
            </p>
            <button onClick={generateToken} disabled={tokenLoading}
              style={{padding:'12px 24px',background:'#1565c0',color:'white',border:'none',borderRadius:8,fontWeight:700,fontSize:14,cursor:'pointer'}}>
              {tokenLoading?'⏳ Generating...':'🔑 Generate My Bookmarklet'}
            </button>
          </div>

          {/* STEP 2: Install bookmarklet (only shown after token generated) */}
          {importToken && (
            <div style={{background:'linear-gradient(135deg,#b71c1c,#e53935)',borderRadius:12,padding:24,marginBottom:16,color:'white'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                <span style={{background:'white',color:'#e53935',width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:14,flexShrink:0}}>2</span>
                <h3 style={{fontWeight:800,fontSize:16}}>Install — Drag to Bookmarks Bar</h3>
              </div>

              <div style={{background:'rgba(255,255,255,0.15)',borderRadius:8,padding:14,marginBottom:16,fontSize:13}}>
                <p style={{fontWeight:700,marginBottom:8}}>Make sure bookmarks bar is visible first:</p>
                <p>Windows/Linux: <strong>Ctrl + Shift + B</strong></p>
                <p style={{marginTop:4}}>Mac: <strong>⌘ + Shift + B</strong></p>
              </div>

              <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
                <a href={bookmarklet}
                  onClick={e=>{e.preventDefault();toast('👆 DRAG the red button to your bookmarks bar — do not click it here!');}}
                  style={{display:'inline-flex',alignItems:'center',gap:8,background:'white',color:'#e53935',padding:'14px 22px',borderRadius:10,fontWeight:900,fontSize:15,textDecoration:'none',cursor:'grab',border:'3px dashed #c62828',userSelect:'none',flexShrink:0}}
                  draggable="true"
                  title="Drag me to your bookmarks bar!">
                  🛒 Import to WholesaleMart
                </a>
                <div style={{fontSize:13,opacity:0.95}}>
                  <p style={{fontWeight:700,marginBottom:4}}>← Drag this to your bookmarks bar</p>
                  <p style={{fontSize:12}}>Do NOT click — only drag it!</p>
                </div>
              </div>

              <div style={{background:'rgba(255,255,255,0.1)',borderRadius:8,padding:12,marginTop:16,fontSize:12}}>
                ✅ Token embedded · Works from any website · Valid for 30 days
              </div>
            </div>
          )}

          {/* STEP 3: Use it */}
          <div style={{background:'white',borderRadius:12,padding:24,marginBottom:16,boxShadow:'0 2px 8px rgba(0,0,0,0.08)',border:'1px solid #e0e0e0',opacity:importToken?1:0.5}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
              <span style={{background:'#e53935',color:'white',width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:14,flexShrink:0}}>3</span>
              <h3 style={{fontWeight:800,fontSize:16}}>Use on Any Product Page</h3>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {[
                {icon:'🌐', text:'Open any product page in your browser'},
                {icon:'🔖', text:'Click "Import to WholesaleMart" in your bookmarks bar'},
                {icon:'✅', text:'A popup shows the extracted name, price, images — click OK'},
                {icon:'⏳', text:'Product appears in Pending tab below for your review'},
                {icon:'🚀', text:'Click Approve → product goes live in your store!'},
              ].map(({icon,text})=>(
                <div key={text} style={{display:'flex',gap:10,alignItems:'center',padding:'8px 12px',background:'#f8f8f8',borderRadius:8}}>
                  <span style={{fontSize:20,flexShrink:0}}>{icon}</span>
                  <span style={{fontSize:13,color:'#333'}}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* What gets extracted */}
          <div style={{background:'#e8f5e9',borderRadius:10,padding:18,marginBottom:16,border:'1px solid #a5d6a7'}}>
            <p style={{fontWeight:800,color:'#1b5e20',marginBottom:10}}>🔬 Automatically extracted from any product page:</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
              {['✅ Product name','✅ Selling price + MRP','✅ Discount %','✅ All images (up to 8)','✅ Category','✅ Brand / Supplier','✅ Full description','✅ Source URL'].map(t=>(
                <div key={t} style={{fontSize:13,color:'#1b5e20'}}>{t}</div>
              ))}
            </div>
          </div>

          {/* Manual fallback */}
          <div style={{background:'#f5f5f5',borderRadius:10,padding:16,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
            <div>
              <p style={{fontWeight:700,marginBottom:3}}>➕ Add manually instead</p>
              <p style={{fontSize:13,color:'#757575'}}>Full control over all fields</p>
            </div>
            <button onClick={()=>openAddForm()} style={{padding:'10px 20px',background:'#e53935',color:'white',border:'none',borderRadius:8,fontWeight:700,cursor:'pointer',fontSize:14,flexShrink:0}}>
              ➕ Add Manually
            </button>
          </div>
        </div>
      )}

      {/* PENDING TAB */}
      {tab==='pending'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <p style={{color:'#757575',fontSize:13}}>{pendingProducts.length} awaiting approval</p>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{loadPending();loadCount();}} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #e0e0e0',background:'white',cursor:'pointer',fontWeight:600,fontSize:13}}>🔄 Refresh</button>
              {pendingProducts.length>0&&<button onClick={approveAll} disabled={approvingAll} style={{padding:'7px 18px',borderRadius:8,background:'#43a047',color:'white',border:'none',cursor:'pointer',fontWeight:700,fontSize:13}}>{approvingAll?'⏳...':'✅ Approve All ('+pendingProducts.length+')'}</button>}
            </div>
          </div>
          {pendingProducts.length===0?(
            <div style={{textAlign:'center',padding:60,color:'#757575'}}>
              <div style={{fontSize:48}}>✅</div>
              <p style={{fontWeight:600,marginTop:12,fontSize:16}}>No pending products</p>
              <button onClick={()=>setTab('import')} style={{marginTop:16,padding:'10px 22px',background:'#e53935',color:'white',border:'none',borderRadius:8,fontWeight:700,cursor:'pointer'}}>⚡ Import Products</button>
            </div>
          ):(
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))',gap:16}}>
              {pendingProducts.map(p=>(
                <div key={p.id} className="card" style={{overflow:'hidden',border:'2px solid #fff8e1'}}>
                  <div style={{position:'relative',paddingTop:'70%',background:'#f5f5f5'}}>
                    <img src={p.image_url||'https://via.placeholder.com/270x190?text=No+Image'} alt=""
                      style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}
                      onError={e=>{e.target.src='https://via.placeholder.com/270x190?text=No+Image';}}/>
                    <span style={{position:'absolute',top:8,left:8,background:'#f57f17',color:'white',fontSize:10,padding:'3px 8px',borderRadius:5,fontWeight:700}}>⏳ PENDING</span>
                    {Array.isArray(p.images)&&p.images.length>1&&<span style={{position:'absolute',top:8,right:8,background:'rgba(0,0,0,0.6)',color:'white',fontSize:10,padding:'2px 7px',borderRadius:5}}>📷 {p.images.length}</span>}
                  </div>
                  <div style={{padding:14}}>
                    <p style={{fontWeight:700,fontSize:13,marginBottom:4,lineHeight:1.4}}>{p.name}</p>
                    <p style={{fontSize:11,color:'#757575',marginBottom:8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.description||'No description'}</p>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                      <span style={{fontWeight:800,color:'#e53935',fontSize:16}}>₹{Number(p.price).toLocaleString('en-IN')}</span>
                      {p.original_price>p.price&&<span style={{fontSize:12,color:'#9e9e9e',textDecoration:'line-through'}}>₹{Number(p.original_price).toLocaleString('en-IN')}</span>}
                      {p.discount_pct>0&&<span style={{background:'#ffebee',color:'#e53935',fontSize:10,padding:'1px 5px',borderRadius:4,fontWeight:700}}>{p.discount_pct}% OFF</span>}
                    </div>
                    {p.category&&<p style={{fontSize:11,color:'#555',marginBottom:6}}>📁 {p.category}{p.brand?' · 🏷 '+p.brand:''}</p>}
                    {p.source_url&&<a href={p.source_url} target="_blank" rel="noopener noreferrer" style={{display:'block',fontSize:11,color:'#1565c0',fontWeight:600,marginBottom:10,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>🔗 View source ↗</a>}
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>approve(p.id)} style={{flex:1,padding:'9px',background:'#43a047',color:'white',border:'none',borderRadius:8,fontWeight:700,cursor:'pointer',fontSize:13}}>✅ Approve</button>
                      <button onClick={()=>openEditForm(p)} style={{padding:'9px 12px',background:'#e3f2fd',color:'#1565c0',border:'none',borderRadius:8,fontWeight:700,cursor:'pointer',fontSize:13}}>✏️</button>
                      <button onClick={()=>reject(p.id)} style={{padding:'9px 12px',background:'#ffebee',color:'#c62828',border:'none',borderRadius:8,fontWeight:700,cursor:'pointer',fontSize:13}}>✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PRODUCTS TAB */}
      {tab==='products'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <p style={{color:'#757575',fontSize:13}}>{allProducts.length} products</p>
            <div style={{display:'flex',gap:8}}>
              <button onClick={loadAll} style={{padding:'7px 12px',borderRadius:8,border:'1px solid #e0e0e0',background:'white',cursor:'pointer',fontWeight:600,fontSize:13}}>🔄</button>
              <button onClick={()=>openAddForm()} style={{padding:'7px 18px',borderRadius:8,background:'#e53935',color:'white',border:'none',cursor:'pointer',fontWeight:700,fontSize:13}}>➕ Add</button>
            </div>
          </div>
          {loading?<div className="spinner"/>:(
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',background:'white',borderRadius:8,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
                <thead><tr style={{background:'#f5f5f5'}}>
                  {['Img','Product','Price','Category','Source','Status','Actions'].map(h=>(
                    <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:11,fontWeight:700,color:'#757575',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {allProducts.map((p,i)=>(
                    <tr key={p.id} style={{borderTop:'1px solid #f0f0f0',background:i%2?'#fafafa':'white'}}>
                      <td style={{padding:'8px 12px'}}>
                        <div style={{position:'relative',width:50,height:50}}>
                          <img src={p.image_url||'https://via.placeholder.com/50?text=?'} alt="" style={{width:50,height:50,objectFit:'cover',borderRadius:5}} onError={e=>{e.target.src='https://via.placeholder.com/50?text=?';}}/>
                          {Array.isArray(p.images)&&p.images.length>1&&<span style={{position:'absolute',bottom:-3,right:-3,background:'#1565c0',color:'white',fontSize:8,padding:'1px 3px',borderRadius:6,fontWeight:700}}>+{p.images.length-1}</span>}
                        </div>
                      </td>
                      <td style={{padding:'8px 12px',maxWidth:200}}>
                        <p style={{fontWeight:700,fontSize:12,marginBottom:1}}>{p.name}</p>
                        <p style={{fontSize:10,color:'#757575',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:180}}>{p.description||'—'}</p>
                        {p.brand&&<p style={{fontSize:10,color:'#1565c0'}}>🏷 {p.brand}</p>}
                      </td>
                      <td style={{padding:'8px 12px',whiteSpace:'nowrap'}}>
                        <p style={{fontWeight:700,color:'#e53935',fontSize:13}}>₹{Number(p.price).toLocaleString('en-IN')}</p>
                        {p.original_price>p.price&&<p style={{fontSize:10,color:'#9e9e9e',textDecoration:'line-through'}}>₹{Number(p.original_price).toLocaleString('en-IN')}</p>}
                      </td>
                      <td style={{padding:'8px 12px',fontSize:11}}>{p.category||'—'}</td>
                      <td style={{padding:'8px 12px'}}>{p.source_url?<a href={p.source_url} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:'#1565c0',fontWeight:600}}>🔗 Source ↗</a>:<span style={{color:'#bdbdbd',fontSize:11}}>—</span>}</td>
                      <td style={{padding:'8px 12px'}}><button onClick={()=>togglePublish(p)} style={{padding:'3px 8px',borderRadius:10,border:'none',cursor:'pointer',fontSize:10,fontWeight:700,background:p.is_published?'#e8f5e9':'#ffebee',color:p.is_published?'#2e7d32':'#c62828'}}>{p.is_published?'✅ Live':'⛔ Hidden'}</button></td>
                      <td style={{padding:'8px 12px'}}><div style={{display:'flex',gap:5}}>
                        <button onClick={()=>openEditForm(p)} style={{padding:'4px 8px',borderRadius:5,background:'#e3f2fd',color:'#1565c0',border:'none',cursor:'pointer',fontWeight:700,fontSize:11}}>✏️</button>
                        <button onClick={()=>deleteProduct(p.id,p.name)} style={{padding:'4px 8px',borderRadius:5,background:'#ffebee',color:'#c62828',border:'none',cursor:'pointer',fontWeight:700,fontSize:11}}>🗑</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!allProducts.length&&!loading&&(
                <div style={{textAlign:'center',padding:50,color:'#757575'}}>
                  <div style={{fontSize:40}}>📦</div>
                  <p style={{fontWeight:600,marginTop:10}}>No products yet</p>
                  <button onClick={()=>setTab('import')} style={{marginTop:12,padding:'9px 22px',background:'#e53935',color:'white',border:'none',borderRadius:8,fontWeight:700,cursor:'pointer'}}>⚡ Import Products</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
