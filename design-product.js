// On load, read `id` query param and fetch product details to populate preview
(async function(){
    function qs(name){
        return new URLSearchParams(window.location.search).get(name);
    }

    const id = qs('id');
    if (!id) return;

    try {
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        const p = data.product;
        if (!p) return;

        // Set base image and default values
        const base = document.getElementById('baseProductImage');
        if (base && p.image) base.src = p.image;

        const designSection = document.getElementById('designSection');
        if (designSection) designSection.style.display = 'block';

        // Show size dropdown only for t-shirt products
        const isTshirt = p.name && p.name.toLowerCase().includes('tshirt') || p.name.toLowerCase().includes('t-shirt');
        const sizeContainer = document.getElementById('sizeContainer');
        if (sizeContainer) sizeContainer.style.display = isTshirt ? 'block' : 'none';

        // Show mobile model dropdown only for mobile cover products
        const isMobileCover = p.name && (p.name.toLowerCase().includes('mobile cover') || (p.name.toLowerCase().includes('mobile') && p.name.toLowerCase().includes('cover')));
        const mobileModelContainer = document.getElementById('mobileModelContainer');
        if (mobileModelContainer) mobileModelContainer.style.display = isMobileCover ? 'block' : 'none';

        // Attach save handler to include product id when adding to cart
        window.selectedProduct = { id: p.id, name: p.name, price: p.price, image: p.image };
        
        // Update cart count on page load
        if (typeof updateCartCount === 'function') updateCartCount();
    } catch (e) {
        console.error('Failed to load product for design page', e);
    }
})();

function saveDesignAndAddToCart(){
    const sp = window.selectedProduct;
    if (!sp) { alert('No product selected'); return; }

    // Use site-wide helpers getCart()/saveCart() which operate on `cartData`
    const cart = typeof getCart === 'function' ? getCart() : JSON.parse(localStorage.getItem('cartData') || '[]');
    cart.push({
        id: sp.id,
        name: sp.name,
        price: sp.price,
        image: sp.image,
        quantity: 1,
        size: document.getElementById('sizeInput')?.value || '',
        mobileModel: document.getElementById('mobileModelInput')?.value || '',
        design: {
            text: document.getElementById('designText')?.textContent || '',
            image: document.getElementById('uploadedDesignImage')?.src || '',
            textColor: document.getElementById('textColorInput')?.value || '#000000',
            size: document.getElementById('sizeInput')?.value || '',
            mobileModel: document.getElementById('mobileModelInput')?.value || ''
        }
    });
    if (typeof saveCart === 'function') {
        saveCart(cart);
    } else {
        localStorage.setItem('cartData', JSON.stringify(cart));
        if (typeof updateCartCount === 'function') updateCartCount();
    }
    
    // Show site-wide success message if available, else fallback to alert
    if (typeof showAlert === 'function') {
        showAlert('Added successfully', 'success');
    } else {
        alert('Added successfully');
    }

    // Reset the design form and preview
    try {
        const imgInput = document.getElementById('designImageInput');
        if (imgInput) imgInput.value = '';
        const upImg = document.getElementById('uploadedDesignImage'); if (upImg) upImg.src = '';
        const textInput = document.getElementById('designTextInput'); if (textInput) textInput.value = '';
        const designText = document.getElementById('designText'); if (designText) designText.textContent = '';
        const colorInput = document.getElementById('textColorInput'); if (colorInput) colorInput.value = '#000000';
        const sizeInput = document.getElementById('sizeInput'); if (sizeInput) sizeInput.value = '';
        const mobileModelInput = document.getElementById('mobileModelInput'); if (mobileModelInput) mobileModelInput.value = '';
        if (designText) designText.style.color = '#000000';
    } catch (e) { console.error('Failed to reset design form', e); }
}

// Preview input bindings for design page
document.getElementById('designImageInput')?.addEventListener('change', function(e){
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev){
        document.getElementById('uploadedDesignImage').src = ev.target.result;
    };
    reader.readAsDataURL(file);
});

document.getElementById('designTextInput')?.addEventListener('input', function(e){
    const txt = document.getElementById('designText');
    if (txt) txt.textContent = e.target.value;
});

document.getElementById('textColorInput')?.addEventListener('input', function(e){
    const txt = document.getElementById('designText');
    if (txt) txt.style.color = e.target.value;
});
