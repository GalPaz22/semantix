// Semantix AI Search - Final Production Version with Yotpo Support
(function(){
  'use strict';

  const S = window.SEMANTIX_SETTINGS || {};
  const C = {
    apiEndpoint: S.apiEndpoint,
    apiKey:      S.apiKey,
    cardWidth:   S.cardWidth,
    cardHeight:  S.cardHeight,
    imageHeight: S.imageHeight,
    titleColor:  S.titleColor,
    priceColor:  S.priceColor,
    explanationColor: S.explanationColor,
    titleFont:   S.titleFont,
    priceFont:   S.priceFont,
    explanationFont: S.explanationFont,
    titleSize:   S.titleSize,
    priceSize:   S.priceSize,
    explanationSize: S.explanationSize,
    titleWeight: S.titleWeight,
    priceWeight: S.priceWeight,
    explanationWeight: S.explanationWeight,
    titleStyle:   S.titleStyle,
    priceStyle:   S.priceStyle,
    explanationStyle: S.explanationStyle,
    titleAlign:  S.titleAlign,
    priceAlign:  S.priceAlign,
    explanationAlign: S.explanationAlign,
    contentOrder: S.contentOrder,
    titlePosition: S.titlePosition,
    pricePosition: S.pricePosition,
    explanationPosition: S.explanationPosition,
    titleTopOffset: S.titleTopOffset,
    priceTopOffset: S.priceTopOffset,
    explanationTopOffset: S.explanationTopOffset,
    contentVerticalOffset: S.contentVerticalOffset,
    // Element margins from admin
    titleMargin: S.titleMargin,
    priceMargin: S.priceMargin,
    explanationMargin: S.explanationMargin,
    ribbonSpacing: S.ribbonSpacing,
    // Yotpo integration
    yotpoEnabled: S.yotpoEnabled,
    yotpoAppKey: S.yotpoAppKey,
    yotpoStoreId: S.yotpoStoreId,
    yotpoApiUrl: S.yotpoApiUrl,
    reviewsToShow: S.reviewsToShow,
    cacheKey:    'semantix_search_data',
    maxItems:    50
  };

  const titleEl   = document.getElementById('semantix-search-title');
  const container = document.getElementById('semantix-results-container');

  function getQuery(){
    const inp = document.querySelector('input[type="search"], input[name="q"], input[name="search"]');
    const inputValue = inp && inp.value.trim();
    const urlParam = new URLSearchParams(location.search).get('q') || new URLSearchParams(location.search).get('search');
    const hashParam = location.hash ? location.hash.substring(1) : '';
    return inputValue || urlParam || hashParam || '';
  }

  function loadCache(){
    try{ return JSON.parse(sessionStorage.getItem(C.cacheKey)); }
    catch{return null;}
  }

  function saveCache(items){
    sessionStorage.setItem(C.cacheKey,
      JSON.stringify({ query, results: items.slice(0,C.maxItems), ts:Date.now() })
    );
  }

  function showState(type,html){
    if (type === 'loader') {
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.minHeight = '300px';
      container.innerHTML = `
        <div class="semantix-${type}" style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center; 
          padding: 2rem;
        ">
          <div class="semantix-loading-spinner" style="
            display: block;
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            animation: semantix-spin 1s linear infinite;
            margin-bottom: 20px;
          "></div>
          <div class="semantix-loading-text" style="
            color: #6b7280;
            font-size: 14px;
            font-weight: 400;
          ">Loading products...</div>
          <style>
            @keyframes semantix-spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </div>
      `;
    } else {
      container.style.display = 'grid';
      container.style.flexDirection = '';
      container.style.alignItems = '';
      container.style.justifyContent = '';
      container.style.minHeight = '';
      container.innerHTML = `<div class="semantix-${type}">${html}</div>`;
    }
  }

  function getElementStyles(type) {
    const styles = {
      fontFamily: C[type + 'Font'] || 'inherit',
      fontSize: (C[type + 'Size'] || 16) + 'px',
      fontWeight: C[type + 'Weight'] || 'normal',
      fontStyle: C[type + 'Style'] || 'normal',
      textAlign: C[type + 'Align'] || 'center',
      color: C[type + 'Color'] || '#000000'
    };
    return Object.entries(styles)
      .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
      .join('; ');
  }

  async function fetchYotpoReviews(productId, productHandle) {
    if (!C.yotpoEnabled || !C.yotpoAppKey) {
      return null;
    }
    try {
      let apiUrl = '';
      if (C.yotpoApiUrl && C.yotpoApiUrl.trim()) {
        apiUrl = C.yotpoApiUrl.replace('{product_id}', productId).replace('{app_key}', C.yotpoAppKey);
      } else {
        apiUrl = `https://api.yotpo.com/v1/apps/${C.yotpoAppKey}/products/${productId}/reviews.json?per_page=${C.reviewsToShow || 3}`;
      }
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Yotpo API error');
      const data = await response.json();
      return data.reviews || [];
    } catch (error) {
      console.warn('Yotpo reviews fetch failed:', error);
      return null;
    }
  }

  function renderYotpoReviews(reviews, productId) {
    if (!reviews || !reviews.length) {
      return '<div class="semantix-no-reviews">No reviews yet</div>';
    }

    let reviewsHtml = '<div class="semantix-reviews-container">';
    reviews.slice(0, C.reviewsToShow || 3).forEach(review => {
      const stars = '★'.repeat(review.score || 5) + '☆'.repeat(5 - (review.score || 5));
      const reviewText = review.content ? (review.content.length > 100 ? 
        review.content.substring(0, 100) + '...' : review.content) : '';
      const reviewerName = review.user ? (review.user.display_name || 'Anonymous') : 'Anonymous';
      reviewsHtml += `
        <div class="semantix-review-item">
          <div class="semantix-review-stars">${stars}</div>
          <div class="semantix-review-text">${reviewText}</div>
          <div class="semantix-review-author">- ${reviewerName}</div>
        </div>
      `;
    });
    reviewsHtml += '</div>';
    return reviewsHtml;
  }

  function extractProductId(product) {
    return product.product_id || product.id || product.handle || product.sku || (product.name?product.name.replace(/\s+/g, '-').toLowerCase():undefined);
  }

  function createContentElement(type, content, url = null) {
    const element = document.createElement('div');
    element.className = `semantix-product-${type}`;
    element.style.cssText = getElementStyles(type);
    const margin = C[type + 'Margin'];
    if (margin && margin.trim()) {
      element.style.margin = margin;
    }
    const topOffset = C[type + 'TopOffset'] || 0;
    if (topOffset !== 0) {
      if (margin && margin.trim()) {
        const currentStyle = element.style.margin;
        element.style.margin = '';
        element.style.cssText += `; margin: ${margin}; margin-top: calc(${margin.split(' ')[0] || '0px'} + ${topOffset}px);`;
      } else {
        element.style.marginTop = topOffset + 'px';
      }
    }
    if (type === 'title' && url) {
      element.innerHTML = `<a href="${url}" style="color: inherit; text-decoration: none;">${content}</a>`;
    } else if (type === 'price') {
      element.innerHTML = content + '₪';
    } else if (type === 'explanation') {
      element.innerHTML = `<span class="icon">✨</span>${content}`;
    } else {
      element.innerHTML = content;
    }
    return element;
  }

  async function render(items){
    container.style.display = 'grid';
    container.style.flexDirection = '';
    container.style.alignItems = '';
    container.style.justifyContent = '';
    container.style.minHeight = '';

    container.innerHTML = '';
    if(!items||!items.length){
      return showState('empty-state','<p>No products found</p>');
    }

    for (const p of items) {
      const card = document.createElement('div');
      card.className = 'semantix-product-card';
      card.style.maxWidth  = C.cardWidth+'px';
      card.style.minHeight = C.cardHeight+'px';

      let ribbons = '';
      if(p.type){
        const ts = Array.isArray(p.type)?p.type:[p.type];
        if(ts.length > 0) {
          ribbons = `<div class="semantix-type-ribbon">${ts[0]}</div>`;
        }
      }

      const badge = p.highlighted
        ? '<div class="semantix-perfect-match-badge">✨ Perfect Match</div>'
        : '';

      const imageContainer = document.createElement('div');
      imageContainer.className = 'semantix-product-image-container';
      imageContainer.style.height = C.imageHeight + 'px';
      imageContainer.innerHTML = `
        ${ribbons}${badge}
        <a href="${p.url}">
          <img src="${p.image}" alt="${p.name}" class="semantix-product-image" loading="lazy">
        </a>
      `;

      const elements = {};
      if (p.name) elements.title = createContentElement('title', p.name, p.url);
      if (p.price) elements.price = createContentElement('price', p.price);
      if (p.explanation) elements.explanation = createContentElement('explanation', p.explanation);

      const contentContainer = document.createElement('div');
      contentContainer.className = 'semantix-product-content';
      if (C.contentVerticalOffset && C.contentVerticalOffset !== 0) {
        contentContainer.style.marginTop = C.contentVerticalOffset + 'px';
      }

      const order = (C.contentOrder || 'title,explanation,price').split(',');
      order.forEach(elementType => {
        const trimmedType = elementType.trim();
        if (elements[trimmedType]) {
          contentContainer.appendChild(elements[trimmedType]);
        }
      });

      if (C.yotpoEnabled) {
        const reviewsContainer = document.createElement('div');
        reviewsContainer.className = 'semantix-reviews-section';
        reviewsContainer.innerHTML = '<div class="semantix-reviews-loading">Loading reviews...</div>';
        contentContainer.appendChild(reviewsContainer);
        const productId = extractProductId(p);
        if (productId) {
          fetchYotpoReviews(productId, p.handle).then(reviews => {
            reviewsContainer.innerHTML = renderYotpoReviews(reviews, productId);
          }).catch(() => {
            reviewsContainer.innerHTML = '<div class="semantix-reviews-error">Reviews unavailable</div>';
          });
        } else {
          reviewsContainer.innerHTML = '<div class="semantix-reviews-error">Product ID not found</div>';
        }
      }

      card.appendChild(imageContainer);
      card.appendChild(contentContainer);
      container.appendChild(card);
    }

    addSemantixLogo();
  }

  function addSemantixLogo() {
    const existingLogo = document.querySelector('.semantix-powered-logo');
    if (existingLogo) {
      existingLogo.remove();
    }
    const logoContainer = document.createElement('div');
    logoContainer.className = 'semantix-powered-logo';
    logoContainer.style.cssText = `
      text-align: center;
      margin-top: 2rem;
      padding: 1rem;
      grid-column: 1 / -1;
    `;
    logoContainer.innerHTML = `
      <a href="https://semantix-ai.com" target="_blank" rel="noopener">
        <img src="https://semantix-ai.com/powered.png" 
             alt="Powered by Semantix AI" 
             style="max-height: 40px; opacity: 0.8; transition: opacity 0.2s;"
             onmouseover="this.style.opacity='1'"
             onmouseout="this.style.opacity='0.8'">
      </a>
    `;
    container.appendChild(logoContainer);
  }

  let query='', retries=0;
  function fetchResults(){
    query = getQuery();
    if(!query) return showState('empty-state','<p>Enter a search term</p>');
    if (titleEl) titleEl.textContent = `Search results for "${query}"`;
    const cached = loadCache();
    if(cached && cached.query===query) return render(cached.results);

    showState('loader','Loading products...');
    fetch(C.apiEndpoint,{
      method:'POST',
      headers:Object.assign({'Content-Type':'application/json'}, C.apiKey?{'x-api-key':C.apiKey}:{}),
      body: JSON.stringify({query})
    })
    .then(r=>r.ok?r.json():Promise.reject(r))
    .then(data=>{
      const items = Array.isArray(data)?data:(data.results||[]);
      saveCache(items);
      render(items);
    })
    .catch(err=>{
      if(retries<2){ retries++; return setTimeout(fetchResults,1500*retries); }
      console.error(err);
      showState('error-state','<p>Error loading products</p>');
    });
  }

  window.semantixTest = function(testQuery = 'wine') {
    query = testQuery;
    fetchResults();
  };

  document.addEventListener('DOMContentLoaded', function() {
    if (!titleEl) {
      console.error('Semantix: Title element not found! Looking for #semantix-search-title');
    }
    if (!container) {
      console.error('Semantix: Container element not found! Looking for #semantix-results-container');
      return;
    }
    fetchResults();
  });
})(); 