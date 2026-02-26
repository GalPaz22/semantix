'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, RefreshCw, Copy } from 'lucide-react';

export default function AdminPanel({ session }) {
  const [apiKey, setApiKey] = useState('');
  const [searchName, setSearchName] = useState('');
  const [processingStatus, setProcessingStatus] = useState('idle');
  const [fetchStatus, setFetchStatus] = useState('idle');
  const [saveCredentialsStatus, setSaveCredentialsStatus] = useState('idle');
  const [syncStatus, setSyncStatus] = useState('idle');

  // User data fetched from API key
  const [userData, setUserData] = useState(null);
  const [userActive, setUserActive] = useState(true);
  const [dbName, setDbName] = useState('');
  const [categories, setCategories] = useState('');
  const [productTypes, setProductTypes] = useState('');
  const [softCategories, setSoftCategories] = useState('');
  const [colors, setColors] = useState('');

  // Site configuration state
  const [siteConfig, setSiteConfig] = useState({
    siteId: '',
    platform: 'woocommerce',
    enabled: true,
    domains: [],
    queryParams: [],
    selectors: {
      resultsGrid: [],
      productCard: [],
      noResults: [],
      pageTitle: [],
      resultsRoot: [],
      searchInput: [],
      productPage: '',
      productId: '',
      productName: '',
      zero: {
        enabled: true,
        host: [],
        gridTag: 'ul',
        gridClass: 'product-grid semantix-zero-grid',
        columns: {
          desktop: 4,
          tablet: 2,
          mobile: 2
        },
        insert: {
          mode: 'after',
          target: []
        },
        style: {
          gapPx: 16,
          marginTopPx: 16,
          cardWidth: "100%"
        }
      }
    },
    nativeCard: {
      cloneFromSelector: '',
      templateHtml: null,
      cardTemplate: '', // New field for card HTML template
      useCustomTemplate: false,
      map: {
        titleSelector: '',
        priceSelector: '',
        imageSelector: '',
        linkSelector: ''
      },
      cleanupSelectors: [],
      disableAddToCart: true,
      disablePostFix: false
    },
    behavior: {
      injectPosition: 'prepend',
      injectCount: 6,
      fadeMs: 260,
      loaderMinMs: 450,
      waitForDomMs: 8000,
      loader: true
    },
    consent: {
      enabled: true,
      storageKey: 'semantix_consent_v3',
      logoUrl: 'https://semantix-ai.com/powered.png',
      title: '🍪 חיפוש מותאם אישית',
      text: 'מאשרים ל־Semantix לשמור סשן לשיפור התוצאות? (בלי אישור עדיין תראה תוצאות חכמות, פשוט בלי session)',
      acceptText: 'כן, אשר',
      declineText: 'לא, תודה',
      zIndex: 1000000
    },
    clickTracking: {
      enabled: true,
      trackNativeClicks: true,
      addToCartSelector: '',
      universalMode: false,
      universalLinkSelector: '',
      forceNavDelay: true,
      forceNavDelayMs: 80,
      queueKey: 'semantix_click_q_v1',
      queueMax: 25,
      cartInterceptor: {
        enabled: true,
        urlPatterns: [],
        checkoutPatterns: [],
        productIdField: 'product_id',
        quantityField: 'quantity'
      }
    },
    placeholderRotate: {
      enabled: true,
      placeholders: [],
      intervalMs: 2400,
      fadeMs: 220,
      startDelayMs: 600,
      pauseOnFocus: true,
      onlyIfEmpty: true
    },
    features: {
      rerankBoost: true,
      injectIntoGrid: true,
      zeroReplace: true,
      disabled: false
    },
    texts: {
      loader: ''
    },
    branding: {
      logoUrl: 'https://semantix-ai.com/powered.png',
      loadingText: 'Semantix AI מחפש עבורך...',
      logoSize: 120
    },
    autocompleteFooter: {
      enabled: true,
      text: 'מופעל על ידי Semantix AI ✨',
      selector: '.autocomplete-dropdown',
      fontSize: '13px'
    },
    aiBadge: {
      enabled: true,
      text: 'AI',
      position: 'top-right',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      textColor: '#8b5cf6',
      borderColor: '#8b5cf6',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderRadius: '8px',
      fontSize: '11px',
      fontWeight: '600',
      padding: '3px 8px',
      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)',
      zIndex: 10
    },
    debug: {
      enabled: false
    },
    zero: {
      replaceNoResultsText: "מחפש תוצאות חכמות...",
      replaceNoResultsSelector: ""
    }
  });

  // Reprocessing options
  const [reprocessOptions, setReprocessOptions] = useState({
    reprocessHardCategories: true,
    reprocessSoftCategories: true,
    reprocessTypes: true,
    reprocessColors: true,
    reprocessVariants: true,
    reprocessEmbeddings: true,
    reprocessDescriptions: true,
    translateBeforeEmbedding: true
  });

  // Filter option: only reprocess products without soft categories
  const [onlyWithoutSoftCategories, setOnlyWithoutSoftCategories] = useState(false);

  // Filter option: only reprocess fresh/unprocessed products
  const [onlyUnprocessed, setOnlyUnprocessed] = useState(false);

  // Incremental mode: add new categories to existing products
  const [incrementalMode, setIncrementalMode] = useState(false);
  const [incrementalSoftCategories, setIncrementalSoftCategories] = useState('');
  const [incrementalHardCategories, setIncrementalHardCategories] = useState('');
  const [incrementalColors, setIncrementalColors] = useState('');
  const [incrementalProcessingStatus, setIncrementalProcessingStatus] = useState('idle');

  // Auto-detect selectors state
  const [analyzeUrl, setAnalyzeUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStatus, setAnalyzeStatus] = useState('idle');
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [userPlatform, setUserPlatform] = useState('');

  // JSON Import state
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [jsonImportText, setJsonImportText] = useState('');

  // Card Template Converter state
  const [showTemplateConverter, setShowTemplateConverter] = useState(false);
  const [rawCardHtml, setRawCardHtml] = useState('');
  const [convertedTemplate, setConvertedTemplate] = useState('');

  const userEmail = session?.user?.email;
  const isAdmin = userEmail === 'galpaz2210@gmail.com';

  const handleFetchUserData = async () => {
    if (!isAdmin || !searchName) return;
    setFetchStatus('loading');
    try {
      const response = await fetch(`/api/admin/lookup-by-apikey?name=${encodeURIComponent(searchName)}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched user data:', data);
        setUserData(data);

        // Auto-populate apiKey from the fetched user (needed for save/sync)
        if (data.user?.apiKey) setApiKey(data.user.apiKey);
        setUserActive(data.user?.active !== false);

        // Extract from nested configuration structure
        const config = data.configuration || {};
        setDbName(config.dbName || '');
        setCategories(Array.isArray(config.categories?.list) ? config.categories.list.join(', ') : '');
        setProductTypes(Array.isArray(config.types?.list) ? config.types.list.join(', ') : '');
        setSoftCategories(Array.isArray(config.softCategories?.list) ? config.softCategories.list.join(', ') : '');
        setColors(Array.isArray(config.colors?.list) ? config.colors.list.join(', ') : '');

        // Extract platform
        const platform = config.platform || data.credentials?.platform || 'woocommerce';
        setUserPlatform(platform);
        console.log('🔧 User platform:', platform);

        // Load siteConfig if it exists
        if (data.credentials?.siteConfig) {
          const savedConfig = data.credentials.siteConfig;
          console.log('📋 Loading saved siteConfig from DB:', savedConfig);

          // Helper function to safely get nested values
          const safeGet = (obj, path, defaultValue) => {
            const keys = path.split('.');
            let result = obj;
            for (const key of keys) {
              if (result === null || result === undefined) return defaultValue;
              result = result[key];
            }
            return result !== undefined ? result : defaultValue;
          };

          setSiteConfig({
            siteId: savedConfig.siteId !== undefined ? savedConfig.siteId : '',
            platform: savedConfig.platform !== undefined ? savedConfig.platform : (platform || 'woocommerce'),
            enabled: savedConfig.enabled !== undefined ? savedConfig.enabled : true,
            domains: savedConfig.domains !== undefined ? savedConfig.domains : [],
            queryParams: savedConfig.queryParams !== undefined ? savedConfig.queryParams : [],
            selectors: {
              resultsGrid: safeGet(savedConfig, 'selectors.resultsGrid', []),
              productCard: safeGet(savedConfig, 'selectors.productCard', []),
              noResults: safeGet(savedConfig, 'selectors.noResults', []),
              pageTitle: safeGet(savedConfig, 'selectors.pageTitle', []),
              resultsRoot: safeGet(savedConfig, 'selectors.resultsRoot', []),
              searchInput: safeGet(savedConfig, 'selectors.searchInput', []),
              productPage: safeGet(savedConfig, 'selectors.productPage', ''),
              productId: safeGet(savedConfig, 'selectors.productId', ''),
              productName: safeGet(savedConfig, 'selectors.productName', ''),
              zero: {
                enabled: safeGet(savedConfig, 'selectors.zero.enabled', true),
                host: safeGet(savedConfig, 'selectors.zero.host', []),
                gridTag: safeGet(savedConfig, 'selectors.zero.gridTag', 'ul'),
                gridClass: safeGet(savedConfig, 'selectors.zero.gridClass', 'product-grid semantix-zero-grid'),
                columns: safeGet(savedConfig, 'selectors.zero.columns', { desktop: 4, tablet: 2, mobile: 2 }),
                insert: safeGet(savedConfig, 'selectors.zero.insert', { mode: 'after', target: [] }),
                style: safeGet(savedConfig, 'selectors.zero.style', { gapPx: 16, marginTopPx: 16, cardWidth: "100%" })
              }
            },
            nativeCard: {
              cloneFromSelector: safeGet(savedConfig, 'nativeCard.cloneFromSelector', ''),
              templateHtml: safeGet(savedConfig, 'nativeCard.templateHtml', null),
              cardTemplate: safeGet(savedConfig, 'nativeCard.cardTemplate', ''),
              useCustomTemplate: safeGet(savedConfig, 'nativeCard.useCustomTemplate', false),
              map: {
                titleSelector: safeGet(savedConfig, 'nativeCard.map.titleSelector', ''),
                priceSelector: safeGet(savedConfig, 'nativeCard.map.priceSelector', ''),
                imageSelector: safeGet(savedConfig, 'nativeCard.map.imageSelector', ''),
                linkSelector: safeGet(savedConfig, 'nativeCard.map.linkSelector', '')
              },
              cleanupSelectors: safeGet(savedConfig, 'nativeCard.cleanupSelectors', []),
              disableAddToCart: safeGet(savedConfig, 'nativeCard.disableAddToCart', true),
              disablePostFix: safeGet(savedConfig, 'nativeCard.disablePostFix', false)
            },
            behavior: {
              injectPosition: safeGet(savedConfig, 'behavior.injectPosition', 'prepend'),
              injectCount: safeGet(savedConfig, 'behavior.injectCount', 6),
              fadeMs: safeGet(savedConfig, 'behavior.fadeMs', 260),
              loaderMinMs: safeGet(savedConfig, 'behavior.loaderMinMs', 450),
              waitForDomMs: safeGet(savedConfig, 'behavior.waitForDomMs', 8000),
              loader: safeGet(savedConfig, 'behavior.loader', true)
            },
            consent: {
              enabled: safeGet(savedConfig, 'consent.enabled', true),
              storageKey: safeGet(savedConfig, 'consent.storageKey', 'semantix_consent_v3'),
              logoUrl: safeGet(savedConfig, 'consent.logoUrl', 'https://semantix-ai.com/powered.png'),
              title: safeGet(savedConfig, 'consent.title', '🍪 חיפוש מותאם אישית'),
              text: safeGet(savedConfig, 'consent.text', 'מאשרים ל־Semantix לשמור סשן לשיפור התוצאות?'),
              acceptText: safeGet(savedConfig, 'consent.acceptText', 'כן, אשר'),
              declineText: safeGet(savedConfig, 'consent.declineText', 'לא, תודה'),
              zIndex: safeGet(savedConfig, 'consent.zIndex', 1000000)
            },
            clickTracking: {
              enabled: safeGet(savedConfig, 'clickTracking.enabled', true),
              trackNativeClicks: safeGet(savedConfig, 'clickTracking.trackNativeClicks', true),
              addToCartSelector: safeGet(savedConfig, 'clickTracking.addToCartSelector', ''),
              universalMode: safeGet(savedConfig, 'clickTracking.universalMode', false),
              universalLinkSelector: safeGet(savedConfig, 'clickTracking.universalLinkSelector', ''),
              forceNavDelay: safeGet(savedConfig, 'clickTracking.forceNavDelay', true),
              forceNavDelayMs: safeGet(savedConfig, 'clickTracking.forceNavDelayMs', 80),
              queueKey: safeGet(savedConfig, 'clickTracking.queueKey', 'semantix_click_q_v1'),
              queueMax: safeGet(savedConfig, 'clickTracking.queueMax', 25),
              cartInterceptor: {
                enabled: safeGet(savedConfig, 'clickTracking.cartInterceptor.enabled', true),
                urlPatterns: safeGet(savedConfig, 'clickTracking.cartInterceptor.urlPatterns', []),
                checkoutPatterns: safeGet(savedConfig, 'clickTracking.cartInterceptor.checkoutPatterns', []),
                productIdField: safeGet(savedConfig, 'clickTracking.cartInterceptor.productIdField', 'product_id'),
                quantityField: safeGet(savedConfig, 'clickTracking.cartInterceptor.quantityField', 'quantity')
              }
            },
            placeholderRotate: {
              enabled: safeGet(savedConfig, 'placeholderRotate.enabled', true),
              placeholders: safeGet(savedConfig, 'placeholderRotate.placeholders', []),
              intervalMs: safeGet(savedConfig, 'placeholderRotate.intervalMs', 2400),
              fadeMs: safeGet(savedConfig, 'placeholderRotate.fadeMs', 220),
              startDelayMs: safeGet(savedConfig, 'placeholderRotate.startDelayMs', 600),
              pauseOnFocus: safeGet(savedConfig, 'placeholderRotate.pauseOnFocus', true),
              onlyIfEmpty: safeGet(savedConfig, 'placeholderRotate.onlyIfEmpty', true)
            },
            features: {
              rerankBoost: safeGet(savedConfig, 'features.rerankBoost', true),
              injectIntoGrid: safeGet(savedConfig, 'features.injectIntoGrid', true),
              zeroReplace: safeGet(savedConfig, 'features.zeroReplace', true),
              disabled: safeGet(savedConfig, 'features.disabled', false)
            },
            texts: {
              loader: safeGet(savedConfig, 'texts.loader', '')
            },
            branding: {
              logoUrl: safeGet(savedConfig, 'branding.logoUrl', 'https://semantix-ai.com/powered.png'),
              loadingText: safeGet(savedConfig, 'branding.loadingText', 'Semantix AI מחפש עבורך...'),
              logoSize: safeGet(savedConfig, 'branding.logoSize', 120)
            },
            autocompleteFooter: {
              enabled: safeGet(savedConfig, 'autocompleteFooter.enabled', true),
              text: safeGet(savedConfig, 'autocompleteFooter.text', 'מופעל על ידי Semantix AI ✨'),
              selector: safeGet(savedConfig, 'autocompleteFooter.selector', '.autocomplete-dropdown'),
              fontSize: safeGet(savedConfig, 'autocompleteFooter.fontSize', '13px')
            },
            aiBadge: {
              enabled: safeGet(savedConfig, 'aiBadge.enabled', true),
              text: safeGet(savedConfig, 'aiBadge.text', 'AI'),
              position: safeGet(savedConfig, 'aiBadge.position', 'top-right'),
              backgroundColor: safeGet(savedConfig, 'aiBadge.backgroundColor', 'rgba(139, 92, 246, 0.1)'),
              textColor: safeGet(savedConfig, 'aiBadge.textColor', '#8b5cf6'),
              borderColor: safeGet(savedConfig, 'aiBadge.borderColor', '#8b5cf6'),
              borderWidth: safeGet(savedConfig, 'aiBadge.borderWidth', '1px'),
              borderStyle: safeGet(savedConfig, 'aiBadge.borderStyle', 'solid'),
              borderRadius: safeGet(savedConfig, 'aiBadge.borderRadius', '8px'),
              fontSize: safeGet(savedConfig, 'aiBadge.fontSize', '11px'),
              fontWeight: safeGet(savedConfig, 'aiBadge.fontWeight', '600'),
              padding: safeGet(savedConfig, 'aiBadge.padding', '3px 8px'),
              boxShadow: safeGet(savedConfig, 'aiBadge.boxShadow', '0 4px 12px rgba(139, 92, 246, 0.25)'),
              zIndex: safeGet(savedConfig, 'aiBadge.zIndex', 10)
            },
            debug: {
              enabled: safeGet(savedConfig, 'debug.enabled', false)
            },
            zero: {
              replaceNoResultsText: safeGet(savedConfig, 'zero.replaceNoResultsText', "מחפש תוצאות חכמות..."),
              replaceNoResultsSelector: safeGet(savedConfig, 'zero.replaceNoResultsSelector', "")
            }
          });

          console.log('✅ siteConfig loaded from DB');
        }

        setFetchStatus('success');
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch user data:', errorData);
        setFetchStatus('error');
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      setFetchStatus('error');
    } finally {
      setTimeout(() => setFetchStatus('idle'), 3000);
    }
  };

  const handleSetActive = async (newValue) => {
    if (!isAdmin || !apiKey) return;
    setUserActive(newValue);
    try {
      await fetch('/api/admin/set-user-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, active: newValue })
      });
    } catch (error) {
      console.error('Failed to set active:', error);
      setUserActive(!newValue); // revert on error
    }
  };

  const handleSaveCredentials = async () => {
    if (!isAdmin || !userData) return;
    setSaveCredentialsStatus('loading');
    try {
      // Normalize siteConfig - convert any string fields back to arrays
      const normalizedSiteConfig = {
        ...siteConfig,
        platform: siteConfig.platform || 'woocommerce',
        enabled: siteConfig.enabled !== undefined ? siteConfig.enabled : true,
        domains: Array.isArray(siteConfig.domains)
          ? siteConfig.domains
          : siteConfig.domains.split(',').map(d => d.trim()).filter(Boolean),
        queryParams: Array.isArray(siteConfig.queryParams)
          ? siteConfig.queryParams
          : siteConfig.queryParams.split(',').map(p => p.trim()).filter(Boolean),
        selectors: {
          ...siteConfig.selectors,
          resultsGrid: Array.isArray(siteConfig.selectors.resultsGrid)
            ? siteConfig.selectors.resultsGrid
            : siteConfig.selectors.resultsGrid.split(',').map(s => s.trim()).filter(Boolean),
          productCard: Array.isArray(siteConfig.selectors.productCard)
            ? siteConfig.selectors.productCard
            : siteConfig.selectors.productCard.split(',').map(s => s.trim()).filter(Boolean),
          noResults: Array.isArray(siteConfig.selectors.noResults)
            ? siteConfig.selectors.noResults
            : siteConfig.selectors.noResults.split(',').map(s => s.trim()).filter(Boolean),
          pageTitle: Array.isArray(siteConfig.selectors.pageTitle)
            ? siteConfig.selectors.pageTitle
            : siteConfig.selectors.pageTitle.split(',').map(s => s.trim()).filter(Boolean),
          resultsRoot: Array.isArray(siteConfig.selectors?.resultsRoot)
            ? siteConfig.selectors.resultsRoot
            : (typeof siteConfig.selectors?.resultsRoot === 'string' && siteConfig.selectors.resultsRoot
              ? siteConfig.selectors.resultsRoot.split(',').map(s => s.trim()).filter(Boolean)
              : []),
          searchInput: Array.isArray(siteConfig.selectors?.searchInput)
            ? siteConfig.selectors.searchInput
            : (typeof siteConfig.selectors?.searchInput === 'string' && siteConfig.selectors.searchInput
              ? siteConfig.selectors.searchInput.split(',').map(s => s.trim()).filter(Boolean)
              : []),
          productPage: siteConfig.selectors?.productPage || '',
          productId: siteConfig.selectors?.productId || '',
          productName: siteConfig.selectors?.productName || '',
          zero: {
            enabled: siteConfig.selectors?.zero?.enabled ?? true,
            host: Array.isArray(siteConfig.selectors?.zero?.host)
              ? siteConfig.selectors.zero.host
              : (typeof siteConfig.selectors?.zero?.host === 'string' && siteConfig.selectors.zero.host
                ? siteConfig.selectors.zero.host.split(',').map(s => s.trim()).filter(Boolean)
                : []),
            gridTag: siteConfig.selectors?.zero?.gridTag || 'ul',
            gridClass: siteConfig.selectors?.zero?.gridClass || 'product-grid semantix-zero-grid',
            columns: {
              desktop: siteConfig.selectors?.zero?.columns?.desktop || 4,
              tablet: siteConfig.selectors?.zero?.columns?.tablet || 2,
              mobile: siteConfig.selectors?.zero?.columns?.mobile || 2
            },
            insert: {
              mode: siteConfig.selectors?.zero?.insert?.mode || 'after',
              target: Array.isArray(siteConfig.selectors?.zero?.insert?.target)
                ? siteConfig.selectors.zero.insert.target
                : (typeof siteConfig.selectors?.zero?.insert?.target === 'string' && siteConfig.selectors.zero.insert.target
                  ? siteConfig.selectors.zero.insert.target.split(',').map(s => s.trim()).filter(Boolean)
                  : [])
            },
            style: {
              gapPx: siteConfig.selectors?.zero?.style?.gapPx || 16,
              marginTopPx: siteConfig.selectors?.zero?.style?.marginTopPx || 16,
              cardWidth: siteConfig.selectors?.zero?.style?.cardWidth || "100%"
            }
          }
        },
        nativeCard: {
          ...siteConfig.nativeCard,
          cleanupSelectors: Array.isArray(siteConfig.nativeCard.cleanupSelectors)
            ? siteConfig.nativeCard.cleanupSelectors
            : siteConfig.nativeCard.cleanupSelectors.split(',').map(s => s.trim()).filter(Boolean)
        },
        placeholderRotate: {
          ...siteConfig.placeholderRotate,
          placeholders: Array.isArray(siteConfig.placeholderRotate?.placeholders)
            ? siteConfig.placeholderRotate.placeholders
            : (typeof siteConfig.placeholderRotate?.placeholders === 'string'
              ? siteConfig.placeholderRotate.placeholders.split('\n').map(s => s.trim()).filter(Boolean)
              : [])
        }
      };

      // Debug: Log cardTemplate and zero config before saving
      console.log('🛒 Saving siteConfig.clickTracking.cartInterceptor:', normalizedSiteConfig.clickTracking?.cartInterceptor);
      console.log('🔍 Saving siteConfig.nativeCard.cardTemplate:', normalizedSiteConfig.nativeCard?.cardTemplate?.substring(0, 100));
      console.log('🎯 Saving siteConfig.selectors.zero:', {
        enabled: normalizedSiteConfig.selectors?.zero?.enabled,
        gridTag: normalizedSiteConfig.selectors?.zero?.gridTag,
        gridClass: normalizedSiteConfig.selectors?.zero?.gridClass,
        columns: normalizedSiteConfig.selectors?.zero?.columns,
        style: normalizedSiteConfig.selectors?.zero?.style
      });

      const response = await fetch('/api/admin/update-user-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          categories: categories.split(',').map(c => c.trim()).filter(Boolean),
          types: productTypes.split(',').map(t => t.trim()).filter(Boolean),
          softCategories: softCategories.split(',').map(s => s.trim()).filter(Boolean),
          colors: colors.split(',').map(c => c.trim()).filter(Boolean),
          siteConfig: normalizedSiteConfig,
          active: userActive
        }),
      });
      if (response.ok) {
        setSaveCredentialsStatus('success');
        // Add a notification about the disabled status if it was changed
        if (normalizedSiteConfig.features.disabled) {
          console.log('⚠️ Features marked as DISABLED for this site.');
        }
      } else {
        setSaveCredentialsStatus('error');
      }
    } catch (error) {
      console.error('Failed to save credentials:', error);
      setSaveCredentialsStatus('error');
    } finally {
      setTimeout(() => setSaveCredentialsStatus('idle'), 3000);
    }
  };

  const handleProcessProducts = async () => {
    if (!isAdmin || !userData || !dbName) return;

    setProcessingStatus('loading');
    try {
      const response = await fetch('/api/reprocess-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbName,
          categories: categories.split(',').map(c => c.trim()).filter(Boolean),
          type: productTypes.split(',').map(t => t.trim()).filter(Boolean),
          softCategories: softCategories.split(',').map(s => s.trim()).filter(Boolean),
          colors: colors.split(',').map(c => c.trim()).filter(Boolean),
          onlyWithoutSoftCategories,
          onlyUnprocessed,
          incrementalMode: false, // Regular reprocessing - not incremental
          incrementalSoftCategories: [],
          ...reprocessOptions
        }),
      });
      if (response.ok) {
        setProcessingStatus('success');
      } else {
        const errorData = await response.json();
        console.error('Failed to process products:', errorData);
        setProcessingStatus('error');
      }
    } catch (error) {
      console.error('Failed to process products:', error);
      setProcessingStatus('error');
    } finally {
      setTimeout(() => setProcessingStatus('idle'), 3000);
    }
  };

  const handleIncrementalProcess = async () => {
    if (!isAdmin || !userData || !dbName) return;

    // Validate incremental mode - at least one of soft or hard categories or colors must be provided
    const newSoftCats = incrementalSoftCategories.split(',').map(s => s.trim()).filter(Boolean);
    const newHardCats = incrementalHardCategories.split(',').map(s => s.trim()).filter(Boolean);
    const newColors = incrementalColors.split(',').map(s => s.trim()).filter(Boolean);
    if (newSoftCats.length === 0 && newHardCats.length === 0 && newColors.length === 0) {
      alert('אנא הזן לפחות אחד (קטגוריה רכה, קשיחה או צבעים) במצב הוספה מצטברת');
      return;
    }

    setIncrementalProcessingStatus('loading');
    try {
      const response = await fetch('/api/reprocess-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbName,
          categories: categories.split(',').map(c => c.trim()).filter(Boolean),
          type: productTypes.split(',').map(t => t.trim()).filter(Boolean),
          softCategories: softCategories.split(',').map(s => s.trim()).filter(Boolean),
          colors: colors.split(',').map(c => c.trim()).filter(Boolean),
          onlyWithoutSoftCategories: false, // Not relevant for incremental
          onlyUnprocessed: false, // Not relevant for incremental
          incrementalMode: true, // INCREMENTAL MODE
          incrementalSoftCategories: newSoftCats,
          incrementalHardCategories: newHardCats,
          incrementalColors: newColors,
          // Reprocess options are ignored in incremental mode
          reprocessHardCategories: false,
          reprocessSoftCategories: false,
          reprocessTypes: false,
          reprocessVariants: false,
          reprocessEmbeddings: false,
          reprocessDescriptions: false,
          translateBeforeEmbedding: false,
          reprocessAll: false
        }),
      });
      if (response.ok) {
        setIncrementalProcessingStatus('success');

        // Update the UI with merged soft categories
        if (newSoftCats.length > 0) {
          const currentSoft = softCategories.split(',').map(s => s.trim()).filter(Boolean);
          const mergedSoft = [...new Set([...currentSoft, ...newSoftCats])];
          setSoftCategories(mergedSoft.join(', '));
          console.log('✅ Soft categories updated in UI:', mergedSoft.join(', '));
        }

        // Update the UI with merged hard categories
        if (newHardCats.length > 0) {
          const currentHard = categories.split(',').map(c => c.trim()).filter(Boolean);
          const mergedHard = [...new Set([...currentHard, ...newHardCats])];
          setCategories(mergedHard.join(', '));
          console.log('✅ Hard categories updated in UI:', mergedHard.join(', '));
        }

        // Update the UI with merged colors
        if (newColors.length > 0) {
          const currentColors = colors.split(',').map(c => c.trim()).filter(Boolean);
          const mergedColors = [...new Set([...currentColors, ...newColors])];
          setColors(mergedColors.join(', '));
          console.log('✅ Colors updated in UI:', mergedColors.join(', '));
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to process products incrementally:', errorData);
        setIncrementalProcessingStatus('error');
      }
    } catch (error) {
      console.error('Failed to process products incrementally:', error);
      setIncrementalProcessingStatus('error');
    } finally {
      setTimeout(() => setIncrementalProcessingStatus('idle'), 3000);
    }
  };

  // Sync logs state for real-time progress
  const [syncLogs, setSyncLogs] = useState([]);
  const [syncPolling, setSyncPolling] = useState(false);

  // Poll sync status for real-time logs
  const pollSyncStatus = async (targetDbName) => {
    setSyncPolling(true);
    let pollCount = 0;
    const maxPolls = 600; // 10 minutes max (every 1 second)

    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/sync-status?dbName=${encodeURIComponent(targetDbName)}`);
        if (res.ok) {
          const data = await res.json();
          setSyncLogs(data.logs || []);

          if (data.state === 'done') {
            setSyncStatus('success');
            setSyncPolling(false);
            setTimeout(() => setSyncStatus('idle'), 5000);
            return; // Stop polling
          }
          if (data.state === 'error') {
            setSyncStatus('error');
            setSyncPolling(false);
            setTimeout(() => setSyncStatus('idle'), 5000);
            return; // Stop polling
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }

      pollCount++;
      if (pollCount < maxPolls && syncPolling) {
        setTimeout(poll, 1000); // Poll every 1 second
      } else {
        setSyncPolling(false);
      }
    };

    // Start polling after a short delay
    setTimeout(poll, 1500);
  };

  const handleSyncProducts = async () => {
    if (!isAdmin || !userData || !apiKey) return;
    setSyncStatus('loading');
    setSyncLogs([]);
    try {
      const response = await fetch('/api/admin/sync-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey,
          dbName: dbName
        }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Sync started:', data);
        // Start polling for real-time progress
        pollSyncStatus(data.dbName || dbName);
      } else {
        const errorData = await response.json();
        console.error('Failed to sync products:', errorData);
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Failed to sync products:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const toggleOption = (option) => {
    setReprocessOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const toggleAll = () => {
    const allEnabled = Object.values(reprocessOptions).every(v => v);
    const newState = !allEnabled;
    setReprocessOptions({
      reprocessHardCategories: newState,
      reprocessSoftCategories: newState,
      reprocessTypes: newState,
      reprocessVariants: newState,
      reprocessEmbeddings: newState,
      reprocessDescriptions: newState,
      translateBeforeEmbedding: newState
    });
  };

  const getDefaultsByPlatform = (platform) => {
    const wooDefaults = {
      siteId: '',
      platform: 'woocommerce',
      enabled: true,
      domains: [],
      queryParams: ["q", "s", "query", "search", "term"],
      selectors: {
        resultsGrid: ["ul.products", ".woocommerce ul.products", ".products", ".product-grid"],
        productCard: ["li.product", ".grid__item", ".product-card"],
        noResults: ["div.woocommerce-no-products-found", "div.woocommerce-info", ".woocommerce-message"],
        pageTitle: [".woocommerce-products-header__title", "h1.page-title"],
        resultsRoot: ["main", "[role='main']", ".main-content", "#main"],
        searchInput: ["input[type='search']", "input[name='s']", "input[name='q']", "form[action*='search'] input"],
        productPage: ".product-type-simple, .product-type-variable",
        productId: ".post",
        productName: ".product_title",
        zero: {
          enabled: true,
          host: ["main", "#main", ".main-content", "body"],
          gridTag: "ul",
          gridClass: "products semantix-zero-grid woocommerce",
          columns: { desktop: 4, tablet: 3, mobile: 2 },
          insert: { mode: "after", target: [".woocommerce-info", ".no-results", "main"] },
          style: { gapPx: 16, marginTopPx: 16 }
        }
      },
      nativeCard: {
        cloneFromSelector: "ul.products li.product",
        templateHtml: null,
        cardTemplate: '',
        map: {
          titleSelector: ".woocommerce-loop-product__title",
          priceSelector: ".price",
          imageSelector: "img",
          linkSelector: "a.woocommerce-LoopProduct-link, a.woocommerce-loop-product__link"
        },
        cleanupSelectors: [".out-of-stock", ".onsale"],
        disableAddToCart: true
      },
      behavior: {
        injectPosition: "prepend",
        injectCount: 6,
        fadeMs: 180,
        loaderMinMs: 450,
        waitForDomMs: 8000,
        loader: true
      },
      consent: {
        enabled: true,
        storageKey: 'semantix_consent_v3',
        logoUrl: 'https://semantix-ai.com/powered.png',
        title: '🍪 חיפוש מותאם אישית',
        text: 'מאשרים ל־Semantix לשמור סשן לשיפור התוצאות? (בלי אישור עדיין תראה תוצאות חכמות, פשוט בלי session)',
        acceptText: 'כן, אשר',
        declineText: 'לא, תודה',
        zIndex: 1000000
      },
      clickTracking: {
        enabled: true,
        trackNativeClicks: true,
        addToCartSelector: ".single_add_to_cart_button",
        universalMode: false,
        universalLinkSelector: '',
        forceNavDelay: true,
        forceNavDelayMs: 80,
        queueKey: 'semantix_click_q_v1',
        queueMax: 25
      },
      placeholderRotate: {
        enabled: true,
        placeholders: [
          "חפש מוצרים…",
          "נסו: טבעת כסף",
          "נסו: שרשרת עדינה",
          "נסו: מתנה ליום הולדת",
          "נסו: עגילים חדשים"
        ],
        intervalMs: 2400,
        fadeMs: 220,
        startDelayMs: 600,
        pauseOnFocus: true,
        onlyIfEmpty: true
      },
      features: {
        rerankBoost: false,
        injectIntoGrid: true,
        zeroReplace: true,
        disabled: false
      },
      texts: {
        loader: "טוען תוצאות חכמות"
      },
      debug: {
        enabled: false
      }
    };

    const shopifyDefaults = {
      siteId: '',
      platform: 'shopify',
      enabled: true,
      domains: [],
      queryParams: ["q", "s", "query", "search", "term"],
      selectors: {
        resultsGrid: ["ul.product-grid", ".product-grid", ".collection-grid", ".grid--uniform", ".product-grid-container", "[data-section-type='search'] .grid", "[data-section-type='collection'] .grid", "main .grid"],
        productCard: ["li.product-grid__item", "li.product", ".grid__item", ".product-card", ".card-wrapper", "[data-product-id]", "[data-product_id]", "product-card"],
        noResults: [".search__no-results", ".search-no-results", ".template-search__results .empty-state", ".predictive-search__results--empty", ".collection--empty", ".empty-state", ".no-results", "[data-empty-state]", "main .rte"],
        pageTitle: [".collection-header__title", "h1.title"],
        resultsRoot: ["main", "[role='main']", ".main-content", "#MainContent", "body"],
        searchInput: ["input[type='search']", "form[action*='search'] input[type='search']", "form[action*='search'] input[type='text']", "header input[type='search']", "header input[name='q']", "input[name='q']", "input[name='s']"],
        productPage: ".product-single, .product-template",
        productId: "#ProductSection",
        productName: ".product-single__title",
        zero: {
          enabled: true,
          host: ["main", "#MainContent", "[role='main']", ".main-content"],
          gridTag: "ul",
          gridClass: "product-grid semantix-zero-grid",
          columns: { desktop: 4, tablet: 2, mobile: 2 },
          insert: { mode: "after", target: [".search__no-results", ".search-no-results", ".empty-state", ".no-results", "main"] },
          style: { gapPx: 16, marginTopPx: 16 }
        }
      },
      nativeCard: {
        cloneFromSelector: ".collection-grid .grid__item",
        templateHtml: null,
        cardTemplate: '',
        map: {
          titleSelector: ".product-card__title",
          priceSelector: ".price",
          imageSelector: "img",
          linkSelector: "a.product-card__link"
        },
        cleanupSelectors: [".badge", ".product-card__badge"],
        disableAddToCart: true
      },
      behavior: {
        injectPosition: "prepend",
        injectCount: 6,
        fadeMs: 180,
        loaderMinMs: 450,
        waitForDomMs: 8000,
        loader: true
      },
      consent: {
        enabled: true,
        storageKey: 'semantix_consent_v3',
        logoUrl: 'https://semantix-ai.com/powered.png',
        title: '🍪 Personalized Search',
        text: 'Allow Semantix to save session for better results? (You\'ll still see smart results without consent, just no session)',
        acceptText: 'Yes, Accept',
        declineText: 'No, Thanks',
        zIndex: 1000000
      },
      clickTracking: {
        enabled: true,
        trackNativeClicks: true,
        addToCartSelector: "button[name='add']",
        universalMode: false,
        universalLinkSelector: '',
        forceNavDelay: true,
        forceNavDelayMs: 80,
        queueKey: 'semantix_click_q_v1',
        queueMax: 25
      },
      placeholderRotate: {
        enabled: true,
        placeholders: [
          "Search products…",
          "Try: silver ring",
          "Try: delicate necklace",
          "Try: birthday gift",
          "Try: new earrings"
        ],
        intervalMs: 2400,
        fadeMs: 220,
        startDelayMs: 600,
        pauseOnFocus: true,
        onlyIfEmpty: true
      },
      features: {
        rerankBoost: false,
        injectIntoGrid: true,
        zeroReplace: true,
        disabled: false
      },
      texts: {
        loader: "Loading smart results..."
      },
      debug: {
        enabled: false
      }
    };

    return platform === 'shopify' ? shopifyDefaults : wooDefaults;
  };

  const loadWooCommerceDefaults = () => {
    setSiteConfig(getDefaultsByPlatform('woocommerce'));
  };

  const loadPlatformDefaults = () => {
    const platform = userPlatform || 'woocommerce';
    setSiteConfig(getDefaultsByPlatform(platform));
  };

  const loadShopifyTestDefaults = () => {
    setSiteConfig({
      siteId: "semantix-test-myshopify",
      platform: "shopify",
      enabled: true,
      domains: [],
      queryParams: ["q", "s", "query", "search", "term"],
      behavior: {
        injectPosition: "prepend",
        injectCount: 6,
        fadeMs: 180,
        loaderMinMs: 450,
        waitForDomMs: 9000,
        loader: true
      },
      consent: {
        enabled: true,
        storageKey: "semantix_consent_v3",
        logoUrl: "https://semantix-ai.com/powered.png",
        title: "🍪 חיפוש מותאם אישית",
        text: "מאשרים ל־Semantix לשמור סשן לשיפור התוצאות? (בלי אישור עדיין תראה תוצאות חכמות, פשוט בלי session)",
        acceptText: "כן, אשר",
        declineText: "לא, תודה",
        zIndex: 1000000
      },
      selectors: {
        resultsGrid: [
          "ul.product-grid",
          ".product-grid",
          ".collection-grid",
          ".grid--uniform",
          ".product-grid-container",
          "[data-section-type='search'] .grid",
          "[data-section-type='collection'] .grid",
          "main .grid"
        ],
        productCard: [
          "li.product-grid__item",
          "li.product",
          ".grid__item",
          ".product-card",
          ".card-wrapper",
          "[data-product-id]",
          "[data-product_id]",
          "product-card"
        ],
        resultsRoot: [
          "main",
          "[role='main']",
          ".main-content",
          "#MainContent",
          "body"
        ],
        noResults: [
          ".search__no-results",
          ".search-no-results",
          ".template-search__results .empty-state",
          ".predictive-search__results--empty",
          ".collection--empty",
          ".empty-state",
          ".no-results",
          "[data-empty-state]",
          "main .rte"
        ],
        pageTitle: [],
        zero: {
          enabled: true,
          host: [
            "main",
            "#MainContent",
            "[role='main']",
            ".main-content"
          ],
          gridTag: "ul",
          gridClass: "product-grid semantix-zero-grid",
          columns: {
            desktop: 4,
            tablet: 2,
            mobile: 2
          },
          insert: {
            mode: "after",
            target: [
              ".search__no-results",
              ".search-no-results",
              ".empty-state",
              ".no-results",
              "main"
            ]
          },
          style: {
            gapPx: 16,
            marginTopPx: 16
          }
        },
        searchInput: [
          "input[type='search']",
          "form[action*='search'] input[type='search']",
          "form[action*='search'] input[type='text']",
          "header input[type='search']",
          "header input[name='q']",
          "input[name='q']",
          "input[name='s']"
        ],
        productPage: ".product-single, .product-template",
        productId: "#ProductSection",
        productName: ".product-single__title"
      },
      nativeCard: {
        cloneFromSelector: '',
        templateHtml: null,
        cardTemplate: '',
        map: {
          linkSelector: "a.product-card__link, a[ref='productCardLink'], a.contents, a[href*='/products/']",
          titleSelector: "h3.h4, [ref='productTitleLink'] .text-block p, .product-card__content h3, .product-card__title, h3, h4",
          priceSelector: ".price, product-price .price, [data-block-id*='price'] .price, [class*='price']",
          imageSelector: "img.product-media__image, .product-media img, img"
        },
        cleanupSelectors: [],
        disableAddToCart: true
      },
      clickTracking: {
        enabled: true,
        trackNativeClicks: true,
        addToCartSelector: "button[name='add']",
        universalMode: false,
        universalLinkSelector: '',
        forceNavDelay: true,
        forceNavDelayMs: 80,
        queueKey: "semantix_click_q_v1",
        queueMax: 25
      },
      placeholderRotate: {
        enabled: true,
        placeholders: [
          "חפשו מוצרים…",
          "נסו: טבעת כסף",
          "נסו: שרשרת עדינה",
          "נסו: מתנה ליום הולדת",
          "נסו: עגילים חדשים",
          "נסו: יפו סובאג׳"
        ],
        intervalMs: 2400,
        fadeMs: 220,
        startDelayMs: 600,
        pauseOnFocus: true,
        onlyIfEmpty: true
      },
      features: {
        rerankBoost: false,
        injectIntoGrid: true,
        zeroReplace: true
      },
      texts: {
        loader: "טוען תוצאות חכמות"
      },
      debug: {
        enabled: false
      }
    });
  };

  const copySiteConfigToClipboard = () => {
    const configJson = JSON.stringify(siteConfig, null, 2);
    navigator.clipboard.writeText(configJson).then(() => {
      alert('✓ Site configuration copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  /**
   * Universal Card Template Converter
   * Takes any product card HTML and converts it to a Semantix template
   */
  const convertToUniversalTemplate = (cardHtml) => {
    try {
      // Create a temporary element to parse the HTML
      const temp = document.createElement('div');
      temp.innerHTML = cardHtml.trim();
      const card = temp.firstElementChild;

      if (!card) {
        console.error('[Semantix] Invalid HTML provided');
        return null;
      }

      console.log('[Semantix] Converting card to universal template...');

      // === STEP 1: Replace all images ===
      const images = card.querySelectorAll('img');
      images.forEach(img => {
        img.setAttribute('src', '{{image}}');
        img.setAttribute('alt', '{{name}}');
        img.removeAttribute('srcset');
        img.removeAttribute('data-src');
        img.removeAttribute('data-srcset');
        console.log('[Semantix] ✓ Replaced image');
      });

      // === STEP 2: Replace all links ===
      const links = card.querySelectorAll('a[href]');
      links.forEach(link => {
        const href = link.getAttribute('href');
        // Only replace product links, not cart/other links
        if (href && !href.includes('cart') && !href.includes('javascript')) {
          link.setAttribute('href', '{{url}}');
          console.log('[Semantix] ✓ Replaced link');
        }
      });

      // === STEP 3: Find and replace product name ===
      const titleSelectors = [
        'h1', 'h2', 'h3', 'h4',
        '.product-title', '.product-name', '.pname',
        '[class*="title"]', '[class*="name"]',
        '[itemprop="name"]'
      ];

      let titleReplaced = false;
      for (const sel of titleSelectors) {
        const titleEl = card.querySelector(sel);
        if (titleEl && titleEl.textContent.trim()) {
          titleEl.textContent = '{{name}}';
          console.log(`[Semantix] ✓ Replaced title: ${sel}`);
          titleReplaced = true;
          break;
        }
      }

      // === STEP 4: Find and replace price ===
      const priceSelectors = [
        '.price', '.priceNum', '.amount',
        '[class*="price"]', '[class*="amount"]',
        '[itemprop="price"]'
      ];

      let priceReplaced = false;
      for (const sel of priceSelectors) {
        const priceEls = card.querySelectorAll(sel);
        priceEls.forEach(priceEl => {
          const text = priceEl.textContent.trim();
          // Check if it looks like a price (has numbers and currency symbols)
          if (text && /[\d₪$€£¥]/.test(text)) {
            // Preserve currency position and format
            const currencyMatch = text.match(/([₪$€£¥])/);
            const currency = currencyMatch?.[0] || '';

            // Check if currency is before or after the number
            const currencyIndex = text.indexOf(currency);
            const hasNumberBefore = /\d/.test(text.substring(0, currencyIndex));

            if (hasNumberBefore) {
              // Currency after number (e.g., "99₪")
              priceEl.textContent = '{{price}}' + currency;
            } else {
              // Currency before number (e.g., "$99")
              priceEl.textContent = currency + '{{price}}';
            }

            console.log(`[Semantix] ✓ Replaced price: ${sel} (currency: ${currency})`);
            priceReplaced = true;
          }
        });
        if (priceReplaced) break;
      }

      // === STEP 5: Remove "Add to Cart" buttons ===
      const cartSelectors = [
        'button[name="add"]',
        '.add-to-cart', '.addtocart',
        '[class*="add-to-cart"]',
        'form[action*="cart"]',
        '.itemToCart', '.cartButton'
      ];

      cartSelectors.forEach(sel => {
        card.querySelectorAll(sel).forEach(el => {
          el.remove();
          console.log(`[Semantix] ✓ Removed cart button: ${sel}`);
        });
      });

      // === STEP 6: Clean up badges/labels ===
      const badgeSelectors = [
        '.badge', '.label', '.tag',
        '[class*="badge"]', '[class*="label"]',
        '[class*="sale"]', '[class*="new"]'
      ];

      badgeSelectors.forEach(sel => {
        card.querySelectorAll(sel).forEach(el => {
          // Only remove if it's a visual badge, not price container
          if (!el.querySelector('.price, .priceNum, [itemprop="price"]')) {
            el.remove();
            console.log(`[Semantix] ✓ Removed badge: ${sel}`);
          }
        });
      });

      // === STEP 7: Add Semantix data attributes to root ===
      card.setAttribute('data-semantix-ai', '1');
      card.setAttribute('data-semantix-injected', '1');
      card.setAttribute('data-semantix-pid', '{{id}}');
      card.setAttribute('data-semantix-name', '{{name}}');
      card.setAttribute('data-semantix-url', '{{url}}');

      // === STEP 8: Return the template HTML ===
      const template = card.outerHTML;

      console.log('[Semantix] ✅ Template conversion complete!');
      console.log('[Semantix] Summary:', {
        titleReplaced,
        priceReplaced,
        imagesReplaced: images.length,
        linksReplaced: links.length
      });

      return template;
    } catch (error) {
      console.error('[Semantix] Conversion error:', error);
      return null;
    }
  };

  const handleConvertTemplate = () => {
    if (!rawCardHtml.trim()) {
      alert('❌ Please paste some HTML first');
      return;
    }

    const converted = convertToUniversalTemplate(rawCardHtml);

    if (converted) {
      setConvertedTemplate(converted);
      alert('✅ Template converted successfully! You can now copy it or use it directly.');
    } else {
      alert('❌ Failed to convert template. Check console for details.');
    }
  };

  const handleUseConvertedTemplate = () => {
    if (!convertedTemplate) {
      alert('❌ No converted template available');
      return;
    }

    setSiteConfig({
      ...siteConfig,
      nativeCard: {
        ...siteConfig.nativeCard,
        cardTemplate: convertedTemplate,
        useCustomTemplate: true
      }
    });

    setShowTemplateConverter(false);
    setRawCardHtml('');
    setConvertedTemplate('');
    alert('✅ Template applied! Don\'t forget to save.');
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(jsonImportText);

      // Deep merge with default structure to prevent undefined errors
      const mergedConfig = {
        siteId: parsed.siteId || '',
        platform: parsed.platform || 'woocommerce',
        enabled: parsed.enabled !== undefined ? parsed.enabled : true,
        domains: parsed.domains || [],
        queryParams: parsed.queryParams || [],
        selectors: {
          resultsGrid: parsed.selectors?.resultsGrid || [],
          productCard: parsed.selectors?.productCard || [],
          noResults: parsed.selectors?.noResults || [],
          pageTitle: parsed.selectors?.pageTitle || [],
          resultsRoot: parsed.selectors?.resultsRoot || [],
          searchInput: parsed.selectors?.searchInput || [],
          productPage: parsed.selectors?.productPage || '',
          productId: parsed.selectors?.productId || '',
          productName: parsed.selectors?.productName || '',
          zero: {
            enabled: parsed.selectors?.zero?.enabled !== undefined ? parsed.selectors.zero.enabled : true,
            host: parsed.selectors?.zero?.host || [],
            gridTag: parsed.selectors?.zero?.gridTag || 'ul',
            gridClass: parsed.selectors?.zero?.gridClass || 'product-grid semantix-zero-grid',
            columns: {
              desktop: parsed.selectors?.zero?.columns?.desktop || 4,
              tablet: parsed.selectors?.zero?.columns?.tablet || 2,
              mobile: parsed.selectors?.zero?.columns?.mobile || 2
            },
            insert: {
              mode: parsed.selectors?.zero?.insert?.mode || 'after',
              target: parsed.selectors?.zero?.insert?.target || []
            },
            style: {
              gapPx: parsed.selectors?.zero?.style?.gapPx || 16,
              marginTopPx: parsed.selectors?.zero?.style?.marginTopPx || 16,
              cardWidth: parsed.selectors?.zero?.style?.cardWidth || "100%"
            }
          }
        },
        nativeCard: {
          cloneFromSelector: parsed.nativeCard?.cloneFromSelector || '',
          templateHtml: parsed.nativeCard?.templateHtml || null,
          cardTemplate: parsed.nativeCard?.cardTemplate || '',
          useCustomTemplate: parsed.nativeCard?.useCustomTemplate !== undefined ? parsed.nativeCard.useCustomTemplate : false,
          map: {
            titleSelector: parsed.nativeCard?.map?.titleSelector || '',
            priceSelector: parsed.nativeCard?.map?.priceSelector || '',
            imageSelector: parsed.nativeCard?.map?.imageSelector || '',
            linkSelector: parsed.nativeCard?.map?.linkSelector || ''
          },
          cleanupSelectors: parsed.nativeCard?.cleanupSelectors || [],
          disableAddToCart: parsed.nativeCard?.disableAddToCart !== undefined ? parsed.nativeCard.disableAddToCart : true,
          disablePostFix: parsed.nativeCard?.disablePostFix !== undefined ? parsed.nativeCard.disablePostFix : false
        },
        behavior: {
          injectPosition: parsed.behavior?.injectPosition || 'prepend',
          injectCount: parsed.behavior?.injectCount || 6,
          fadeMs: parsed.behavior?.fadeMs || 260,
          loaderMinMs: parsed.behavior?.loaderMinMs || 450,
          waitForDomMs: parsed.behavior?.waitForDomMs || 8000,
          loader: parsed.behavior?.loader !== undefined ? parsed.behavior.loader : true
        },
        consent: {
          enabled: parsed.consent?.enabled !== undefined ? parsed.consent.enabled : true,
          storageKey: parsed.consent?.storageKey || 'semantix_consent_v3',
          logoUrl: parsed.consent?.logoUrl || 'https://semantix-ai.com/powered.png',
          title: parsed.consent?.title || '🍪 חיפוש מותאם אישית',
          text: parsed.consent?.text || 'מאשרים ל־Semantix לשמור סשן לשיפור התוצאות? (בלי אישור עדיין תראה תוצאות חכמות, פשוט בלי session)',
          acceptText: parsed.consent?.acceptText || 'כן, אשר',
          declineText: parsed.consent?.declineText || 'לא, תודה',
          zIndex: parsed.consent?.zIndex || 1000000
        },
        clickTracking: {
          enabled: parsed.clickTracking?.enabled !== undefined ? parsed.clickTracking.enabled : true,
          trackNativeClicks: parsed.clickTracking?.trackNativeClicks !== undefined ? parsed.clickTracking.trackNativeClicks : true,
          addToCartSelector: parsed.clickTracking?.addToCartSelector || '',
          universalMode: parsed.clickTracking?.universalMode || false,
          universalLinkSelector: parsed.clickTracking?.universalLinkSelector || '',
          forceNavDelay: parsed.clickTracking?.forceNavDelay !== undefined ? parsed.clickTracking.forceNavDelay : true,
          forceNavDelayMs: parsed.clickTracking?.forceNavDelayMs || 80,
          queueKey: parsed.clickTracking?.queueKey || 'semantix_click_q_v1',
          queueMax: parsed.clickTracking?.queueMax || 25
        },
        placeholderRotate: {
          enabled: parsed.placeholderRotate?.enabled !== undefined ? parsed.placeholderRotate.enabled : true,
          placeholders: parsed.placeholderRotate?.placeholders || [],
          intervalMs: parsed.placeholderRotate?.intervalMs || 2400,
          fadeMs: parsed.placeholderRotate?.fadeMs || 220,
          startDelayMs: parsed.placeholderRotate?.startDelayMs || 600,
          pauseOnFocus: parsed.placeholderRotate?.pauseOnFocus !== undefined ? parsed.placeholderRotate.pauseOnFocus : true,
          cursorBlink: parsed.placeholderRotate?.cursorBlink !== undefined ? parsed.placeholderRotate.cursorBlink : true
        },
        features: {
          rerankBoost: parsed.features?.rerankBoost || false,
          injectIntoGrid: parsed.features?.injectIntoGrid !== undefined ? parsed.features.injectIntoGrid : true,
          zeroReplace: parsed.features?.zeroReplace !== undefined ? parsed.features.zeroReplace : true
        },
        texts: {
          loader: parsed.texts?.loader || 'טוען תוצאות חכמות'
        },
        branding: {
          logoUrl: parsed.branding?.logoUrl || 'https://semantix-ai.com/powered.png',
          loadingText: parsed.branding?.loadingText || 'Semantix AI מחפש עבורך...',
          logoSize: parsed.branding?.logoSize || 120
        },
        autocompleteFooter: {
          enabled: parsed.autocompleteFooter?.enabled !== undefined ? parsed.autocompleteFooter.enabled : true,
          text: parsed.autocompleteFooter?.text || 'מופעל על ידי Semantix AI ✨',
          selector: parsed.autocompleteFooter?.selector || '.autocomplete-dropdown',
          fontSize: parsed.autocompleteFooter?.fontSize || '13px'
        },
        aiBadge: {
          enabled: parsed.aiBadge?.enabled !== undefined ? parsed.aiBadge.enabled : true,
          text: parsed.aiBadge?.text || 'AI',
          position: parsed.aiBadge?.position || 'top-right',
          backgroundColor: parsed.aiBadge?.backgroundColor || 'rgba(139, 92, 246, 0.1)',
          textColor: parsed.aiBadge?.textColor || '#8b5cf6',
          borderColor: parsed.aiBadge?.borderColor || '#8b5cf6',
          borderWidth: parsed.aiBadge?.borderWidth || '1px',
          borderStyle: parsed.aiBadge?.borderStyle || 'solid',
          borderRadius: parsed.aiBadge?.borderRadius || '8px',
          fontSize: parsed.aiBadge?.fontSize || '11px',
          fontWeight: parsed.aiBadge?.fontWeight || '600',
          padding: parsed.aiBadge?.padding || '3px 8px',
          boxShadow: parsed.aiBadge?.boxShadow || '0 4px 12px rgba(139, 92, 246, 0.25)',
          zIndex: parsed.aiBadge?.zIndex || 10
        },
        debug: {
          enabled: parsed.debug?.enabled || false
        }
      };

      setSiteConfig(mergedConfig);
      setShowJsonImport(false);
      setJsonImportText('');
      alert('✅ JSON imported successfully! The form fields have been populated.');
    } catch (error) {
      alert(`❌ Invalid JSON: ${error.message}`);
    }
  };

  const handleAutoDetectSelectors = async () => {
    if (!analyzeUrl) {
      alert('Please enter a URL');
      return;
    }

    setAnalyzing(true);
    setAnalyzeStatus('loading');
    setAnalyzeResult(null);

    try {
      const response = await fetch('/api/admin/analyze-selectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: analyzeUrl,
          platform: userPlatform || 'woocommerce'
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Auto-detection successful:', data);
        setAnalyzeResult(data);
        setAnalyzeStatus('success');

        // Auto-fill the siteConfig with detected values
        if (data.siteConfig) {
          // Extract domain from URL
          const urlObj = new URL(analyzeUrl);
          const detectedDomain = urlObj.hostname;

          setSiteConfig({
            ...data.siteConfig,
            domains: [detectedDomain, `www.${detectedDomain}`]
          });
        }
      } else {
        console.error('Auto-detection failed:', data);
        setAnalyzeStatus('error');
        setAnalyzeResult(data);
      }
    } catch (error) {
      console.error('Failed to analyze:', error);
      setAnalyzeStatus('error');
      setAnalyzeResult({ error: error.message });
    } finally {
      setAnalyzing(false);
      setTimeout(() => setAnalyzeStatus('idle'), 5000);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-lg text-gray-600">You do not have permission to view this panel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      {/* User Lookup Section */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-800">User Lookup</h2>
          <p className="text-sm text-gray-500 mt-1">Enter a user name to fetch and manage their credentials.</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <input
              id="searchName"
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetchUserData()}
              placeholder="Enter user name"
              className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
            />
            <button
              onClick={handleFetchUserData}
              disabled={fetchStatus === 'loading' || !searchName}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {fetchStatus === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Fetch</span>
            </button>
          </div>
          {fetchStatus === 'success' && (
            <p className="text-green-600 text-sm">✓ User data loaded successfully</p>
          )}
          {fetchStatus === 'error' && (
            <p className="text-red-600 text-sm">✗ Failed to fetch user data</p>
          )}
        </div>
      </div>

      {/* Activation */}
      {userData && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700">Account Status</p>
            <p className={`text-xs mt-0.5 ${userActive ? 'text-green-600' : 'text-red-500'}`}>
              {userActive ? 'Active — Semantix is enabled' : 'Inactive — Semantix is disabled'}
            </p>
          </div>
          <button
            onClick={() => handleSetActive(!userActive)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${userActive ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${userActive ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      )}

      {/* User Credentials Editor */}
      {userData && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          <div className="border-b border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-800">User Credentials</h2>
            <div className="text-sm text-gray-500 mt-1 space-y-1">
              <p><span className="font-medium">Email:</span> {userData.user?.email}</p>
              <p><span className="font-medium">Database:</span> {dbName}</p>
              <p>
                <span className="font-medium">Platform:</span>{' '}
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${userPlatform === 'shopify'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-purple-100 text-purple-800'
                  }`}>
                  {userPlatform === 'shopify' ? '🛍️ Shopify' : '🛒 WooCommerce'}
                </span>
              </p>
              <p><span className="font-medium">Products:</span> {userData.configuration?.productCount || 0}</p>
              {userData.credentials?.siteConfig && (
                <p>
                  <span className="font-medium">Site Config:</span>{' '}
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                    ✓ Configured
                  </span>
                </p>
              )}
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories (comma-separated)
              </label>
              <input
                type="text"
                value={categories}
                onChange={(e) => setCategories(e.target.value)}
                placeholder="e.g., יין אדום, יין לבן"
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Types (comma-separated)
              </label>
              <input
                type="text"
                value={productTypes}
                onChange={(e) => setProductTypes(e.target.value)}
                placeholder="e.g., כשר, מבצע"
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Soft Categories (comma-separated)
              </label>
              <input
                type="text"
                value={softCategories}
                onChange={(e) => setSoftCategories(e.target.value)}
                placeholder="e.g., מתנות, אירועים"
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Colors (comma-separated)
              </label>
              <input
                type="text"
                value={colors}
                onChange={(e) => setColors(e.target.value)}
                placeholder="e.g., אדום, כחול, שחור, לבן"
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>

            {/* Auto-Detect Selectors Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-600 rounded-lg">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-purple-900">🤖 AI Auto-Detect Selectors</h3>
                      <p className="text-sm text-purple-700">Paste a search results URL and let AI analyze the page structure</p>
                    </div>
                  </div>
                  {userPlatform && (
                    <button
                      type="button"
                      onClick={loadPlatformDefaults}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                      title={`Load ${userPlatform} defaults`}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Load {userPlatform === 'shopify' ? 'Shopify' : 'WooCommerce'} Defaults
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={analyzeUrl}
                      onChange={(e) => setAnalyzeUrl(e.target.value)}
                      placeholder="https://example.com/?s=search-term"
                      className="flex-1 p-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white"
                      disabled={analyzing}
                    />
                    <button
                      type="button"
                      onClick={handleAutoDetectSelectors}
                      disabled={analyzing || !analyzeUrl}
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-semibold"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          Analyze Page
                        </>
                      )}
                    </button>
                  </div>

                  {analyzeStatus === 'success' && analyzeResult && (
                    <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-green-900 mb-2">✅ Analysis Complete!</h4>
                          <div className="text-sm text-green-800 space-y-1">
                            <p>• Found <strong>{analyzeResult.analysis?.productsFound || 0}</strong> products on the page</p>
                            <p>• Grid: <code className="bg-green-200 px-2 py-0.5 rounded">{analyzeResult.analysis?.detected?.grid}</code></p>
                            <p>• Card: <code className="bg-green-200 px-2 py-0.5 rounded">{analyzeResult.analysis?.detected?.card}</code></p>
                            <p className="mt-2 font-semibold">🎉 Configuration has been auto-filled below!</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {analyzeStatus === 'error' && analyzeResult && (
                    <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-900 mb-1">❌ Analysis Failed</h4>
                          <p className="text-sm text-red-800">{analyzeResult.error || 'Unknown error'}</p>
                          {analyzeResult.suggestion && (
                            <p className="text-sm text-red-700 mt-2">💡 {analyzeResult.suggestion}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {userData?.credentials?.siteConfig && (
                    <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 mb-3">
                      <p className="text-xs text-blue-800">
                        <strong>ℹ️ Existing Config Found:</strong> This user already has selectors configured.
                        You can analyze a new URL to update them or use the buttons above to load defaults.
                      </p>
                    </div>
                  )}

                  <div className="bg-purple-100 border border-purple-300 rounded-lg p-3">
                    <p className="text-xs text-purple-800">
                      <strong>💡 Tip:</strong> Use a search results page URL (e.g., <code>?s=test</code>) with visible products for best results.
                      The AI will analyze the page structure and auto-fill all selectors below.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Site Configuration Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Site Configuration</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowJsonImport(!showJsonImport)}
                    className="px-3 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
                    title="Import JSON configuration"
                  >
                    📥 Import JSON
                  </button>
                  <button
                    type="button"
                    onClick={copySiteConfigToClipboard}
                    className="px-3 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
                    title="Copy current config as JSON"
                  >
                    <Copy className="h-4 w-4" />
                    Copy JSON
                  </button>
                  <button
                    type="button"
                    onClick={loadWooCommerceDefaults}
                    className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    WooCommerce
                  </button>
                  <button
                    type="button"
                    onClick={loadShopifyTestDefaults}
                    className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Shopify Test
                  </button>
                </div>
              </div>

              {/* JSON Import Section */}
              {showJsonImport && (
                <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-purple-800 mb-2">📥 Import JSON Configuration</h4>
                  <p className="text-xs text-purple-600 mb-3">
                    Paste your JSON configuration below. The form fields will be automatically populated.
                  </p>
                  <textarea
                    value={jsonImportText}
                    onChange={(e) => setJsonImportText(e.target.value)}
                    placeholder='{"siteId": "my-site", "platform": "woocommerce", ...}'
                    rows={8}
                    className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={handleImportJson}
                      className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      ✅ Import & Populate Fields
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowJsonImport(false);
                        setJsonImportText('');
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}


              {/* Site ID */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Site ID
                </label>
                <input
                  type="text"
                  value={siteConfig.siteId || ''}
                  onChange={(e) => setSiteConfig({
                    ...siteConfig,
                    siteId: e.target.value
                  })}
                  placeholder="e.g., client-123"
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                />
              </div>

              {/* Platform & Enabled */}
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platform
                  </label>
                  <select
                    value={siteConfig.platform || 'woocommerce'}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      platform: e.target.value
                    })}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                  >
                    <option value="woocommerce">🛒 WooCommerce</option>
                    <option value="shopify">🛍️ Shopify</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="siteConfigEnabled"
                    checked={siteConfig.enabled !== undefined ? siteConfig.enabled : true}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      enabled: e.target.checked
                    })}
                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="siteConfigEnabled" className="mr-3 text-sm font-medium text-gray-700">
                    ✅ Site Config Enabled
                  </label>
                </div>
              </div>

              {/* Domains */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domains (comma-separated)
                </label>
                <input
                  type="text"
                  value={Array.isArray(siteConfig.domains) ? siteConfig.domains.join(', ') : siteConfig.domains}
                  onChange={(e) => setSiteConfig({
                    ...siteConfig,
                    domains: e.target.value
                  })}
                  onBlur={(e) => {
                    // Convert to array only on blur
                    const arr = e.target.value.split(',').map(d => d.trim()).filter(Boolean);
                    setSiteConfig({
                      ...siteConfig,
                      domains: arr
                    });
                  }}
                  placeholder="e.g., manovino.co.il, www.manovino.co.il"
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                />
              </div>

              {/* Query Params */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Query Parameters (comma-separated)
                </label>
                <input
                  type="text"
                  value={Array.isArray(siteConfig.queryParams) ? siteConfig.queryParams.join(', ') : siteConfig.queryParams}
                  onChange={(e) => setSiteConfig({
                    ...siteConfig,
                    queryParams: e.target.value
                  })}
                  onBlur={(e) => {
                    const arr = e.target.value.split(',').map(p => p.trim()).filter(Boolean);
                    setSiteConfig({
                      ...siteConfig,
                      queryParams: arr
                    });
                  }}
                  placeholder="e.g., s, q"
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                />
              </div>

              {/* Selectors */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">CSS Selectors</h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Results Grid (comma-separated)</label>
                    <input
                      type="text"
                      value={Array.isArray(siteConfig.selectors.resultsGrid) ? siteConfig.selectors.resultsGrid.join(', ') : siteConfig.selectors.resultsGrid}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        selectors: {
                          ...siteConfig.selectors,
                          resultsGrid: e.target.value
                        }
                      })}
                      onBlur={(e) => {
                        const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        setSiteConfig({
                          ...siteConfig,
                          selectors: {
                            ...siteConfig.selectors,
                            resultsGrid: arr
                          }
                        });
                      }}
                      placeholder="e.g., ul.products, .products, #product-grid"
                      className="w-full p-2 border border-gray-200 rounded text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Product Card (comma-separated)</label>
                    <input
                      type="text"
                      value={Array.isArray(siteConfig.selectors.productCard) ? siteConfig.selectors.productCard.join(', ') : siteConfig.selectors.productCard}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        selectors: {
                          ...siteConfig.selectors,
                          productCard: e.target.value
                        }
                      })}
                      onBlur={(e) => {
                        const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        setSiteConfig({
                          ...siteConfig,
                          selectors: {
                            ...siteConfig.selectors,
                            productCard: arr
                          }
                        });
                      }}
                      placeholder="e.g., li.product, .product"
                      className="w-full p-2 border border-gray-200 rounded text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">No Results (comma-separated)</label>
                    <input
                      type="text"
                      value={Array.isArray(siteConfig.selectors.noResults) ? siteConfig.selectors.noResults.join(', ') : siteConfig.selectors.noResults}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        selectors: {
                          ...siteConfig.selectors,
                          noResults: e.target.value
                        }
                      })}
                      onBlur={(e) => {
                        const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        setSiteConfig({
                          ...siteConfig,
                          selectors: {
                            ...siteConfig.selectors,
                            noResults: arr
                          }
                        });
                      }}
                      placeholder="e.g., .woocommerce-info, .no-results"
                      className="w-full p-2 border border-gray-200 rounded text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Page Title (comma-separated)</label>
                    <input
                      type="text"
                      value={Array.isArray(siteConfig.selectors.pageTitle) ? siteConfig.selectors.pageTitle.join(', ') : siteConfig.selectors.pageTitle}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        selectors: {
                          ...siteConfig.selectors,
                          pageTitle: e.target.value
                        }
                      })}
                      onBlur={(e) => {
                        const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        setSiteConfig({
                          ...siteConfig,
                          selectors: {
                            ...siteConfig.selectors,
                            pageTitle: arr
                          }
                        });
                      }}
                      placeholder="e.g., .woocommerce-products-header__title, h1"
                      className="w-full p-2 border border-gray-200 rounded text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Search Input (comma-separated) 🔍
                    </label>
                    <input
                      type="text"
                      value={Array.isArray(siteConfig.selectors?.searchInput) ? siteConfig.selectors.searchInput.join(', ') : (siteConfig.selectors?.searchInput || '')}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        selectors: {
                          ...siteConfig.selectors,
                          searchInput: e.target.value
                        }
                      })}
                      onBlur={(e) => {
                        const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        setSiteConfig({
                          ...siteConfig,
                          selectors: {
                            ...siteConfig.selectors,
                            searchInput: arr
                          }
                        });
                      }}
                      placeholder="e.g., input[type='search'], input[name='s']"
                      className="w-full p-2 border border-gray-200 rounded text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Product Page Selector</label>
                      <input
                        type="text"
                        value={siteConfig.selectors?.productPage || ''}
                        onChange={(e) => setSiteConfig({
                          ...siteConfig,
                          selectors: {
                            ...siteConfig.selectors,
                            productPage: e.target.value
                          }
                        })}
                        placeholder="e.g., .product-template"
                        className="w-full p-2 border border-gray-200 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Product ID Selector</label>
                      <input
                        type="text"
                        value={siteConfig.selectors?.productId || ''}
                        onChange={(e) => setSiteConfig({
                          ...siteConfig,
                          selectors: {
                            ...siteConfig.selectors,
                            productId: e.target.value
                          }
                        })}
                        placeholder="e.g., #product-id"
                        className="w-full p-2 border border-gray-200 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Product Name Selector</label>
                      <input
                        type="text"
                        value={siteConfig.selectors?.productName || ''}
                        onChange={(e) => setSiteConfig({
                          ...siteConfig,
                          selectors: {
                            ...siteConfig.selectors,
                            productName: e.target.value
                          }
                        })}
                        placeholder="e.g., .product_title"
                        className="w-full p-2 border border-gray-200 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Results Root (comma-separated) 📍
                  </label>
                  <input
                    type="text"
                    value={Array.isArray(siteConfig.selectors?.resultsRoot) ? siteConfig.selectors.resultsRoot.join(', ') : (siteConfig.selectors?.resultsRoot || '')}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      selectors: {
                        ...siteConfig.selectors,
                        resultsRoot: e.target.value
                      }
                    })}
                    onBlur={(e) => {
                      const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      setSiteConfig({
                        ...siteConfig,
                        selectors: {
                          ...siteConfig.selectors,
                          resultsRoot: arr
                        }
                      });
                    }}
                    placeholder="e.g., main, [role='main'], #MainContent"
                    className="w-full p-2 border border-gray-200 rounded text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Root container for search results
                  </p>
                </div>
              </div>

              {/* Zero Results Grid Configuration */}
              <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-semibold text-orange-900">🎯 Zero Results Grid</h5>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="zeroEnabled"
                      checked={siteConfig.selectors?.zero?.enabled ?? true}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        selectors: {
                          ...siteConfig.selectors,
                          zero: {
                            ...siteConfig.selectors.zero,
                            enabled: e.target.checked
                          }
                        }
                      })}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <label htmlFor="zeroEnabled" className="mr-2 text-xs text-orange-700 font-medium">
                      Enable
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-orange-800 mb-1">Host Selectors</label>
                    <input
                      type="text"
                      value={Array.isArray(siteConfig.selectors?.zero?.host) ? siteConfig.selectors.zero.host.join(', ') : ''}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        selectors: {
                          ...siteConfig.selectors,
                          zero: {
                            ...siteConfig.selectors.zero,
                            host: e.target.value
                          }
                        }
                      })}
                      onBlur={(e) => {
                        const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        setSiteConfig({
                          ...siteConfig,
                          selectors: {
                            ...siteConfig.selectors,
                            zero: {
                              ...siteConfig.selectors.zero,
                              host: arr
                            }
                          }
                        });
                      }}
                      placeholder="main, #MainContent"
                      className="w-full p-2 border border-orange-200 rounded text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-orange-700 mb-1">Grid Tag</label>
                      <input
                        type="text"
                        value={siteConfig.selectors?.zero?.gridTag || 'ul'}
                        onChange={(e) => setSiteConfig({
                          ...siteConfig,
                          selectors: {
                            ...siteConfig.selectors,
                            zero: {
                              ...siteConfig.selectors.zero,
                              gridTag: e.target.value
                            }
                          }
                        })}
                        placeholder="ul"
                        className="w-full p-2 border border-orange-200 rounded text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-orange-700 mb-1">Grid Class</label>
                      <input
                        type="text"
                        value={siteConfig.selectors?.zero?.gridClass || ''}
                        onChange={(e) => setSiteConfig({
                          ...siteConfig,
                          selectors: {
                            ...siteConfig.selectors,
                            zero: {
                              ...siteConfig.selectors.zero,
                              gridClass: e.target.value
                            }
                          }
                        })}
                        placeholder="product-grid semantix-zero-grid"
                        className="w-full p-2 border border-orange-200 rounded text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-orange-800 mb-1">Insert Target</label>
                    <input
                      type="text"
                      value={Array.isArray(siteConfig.selectors?.zero?.insert?.target) ? siteConfig.selectors.zero.insert.target.join(', ') : ''}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        selectors: {
                          ...siteConfig.selectors,
                          zero: {
                            ...siteConfig.selectors.zero,
                            insert: {
                              ...siteConfig.selectors.zero.insert,
                              target: e.target.value
                            }
                          }
                        }
                      })}
                      onBlur={(e) => {
                        const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        setSiteConfig({
                          ...siteConfig,
                          selectors: {
                            ...siteConfig.selectors,
                            zero: {
                              ...siteConfig.selectors.zero,
                              insert: {
                                ...siteConfig.selectors.zero.insert,
                                target: arr
                              }
                            }
                          }
                        });
                      }}
                      placeholder=".no-results, main"
                      className="w-full p-2 border border-orange-200 rounded text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-orange-700 mb-1">Insert Mode</label>
                    <select
                      value={siteConfig.selectors?.zero?.insert?.mode || 'after'}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        selectors: {
                          ...siteConfig.selectors,
                          zero: {
                            ...siteConfig.selectors.zero,
                            insert: {
                              ...siteConfig.selectors.zero.insert,
                              mode: e.target.value
                            }
                          }
                        }
                      })}
                      className="w-full p-2 border border-orange-200 rounded text-sm"
                    >
                      <option value="after">After</option>
                      <option value="before">Before</option>
                      <option value="append">Append</option>
                      <option value="prepend">Prepend</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-orange-700 mb-1">Desktop Cols</label>
                      <input
                        type="number"
                        value={siteConfig.selectors?.zero?.columns?.desktop || 4}
                        onChange={(e) => setSiteConfig({
                          ...siteConfig,
                          selectors: {
                            ...siteConfig.selectors,
                            zero: {
                              ...siteConfig.selectors.zero,
                              columns: {
                                ...siteConfig.selectors.zero.columns,
                                desktop: parseInt(e.target.value) || 4
                              }
                            }
                          }
                        })}
                        className="w-full p-2 border border-orange-200 rounded text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-orange-700 mb-1">Tablet Cols</label>
                      <input
                        type="number"
                        value={siteConfig.selectors?.zero?.columns?.tablet || 2}
                        onChange={(e) => setSiteConfig({
                          ...siteConfig,
                          selectors: {
                            ...siteConfig.selectors,
                            zero: {
                              ...siteConfig.selectors.zero,
                              columns: {
                                ...siteConfig.selectors.zero.columns,
                                tablet: parseInt(e.target.value) || 2
                              }
                            }
                          }
                        })}
                        className="w-full p-2 border border-orange-200 rounded text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-orange-700 mb-1">Mobile Cols</label>
                      <input
                        type="number"
                        value={siteConfig.selectors?.zero?.columns?.mobile || 2}
                        onChange={(e) => setSiteConfig({
                          ...siteConfig,
                          selectors: {
                            ...siteConfig.selectors,
                            zero: {
                              ...siteConfig.selectors.zero,
                              columns: {
                                ...siteConfig.selectors.zero.columns,
                                mobile: parseInt(e.target.value) || 2
                              }
                            }
                          }
                        })}
                        className="w-full p-2 border border-orange-200 rounded text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-orange-700 mb-1">Gap (px)</label>
                      <input
                        type="number"
                        value={siteConfig.selectors?.zero?.style?.gapPx || 16}
                        onChange={(e) => setSiteConfig({
                          ...siteConfig,
                          selectors: {
                            ...siteConfig.selectors,
                            zero: {
                              ...siteConfig.selectors.zero,
                              style: {
                                ...siteConfig.selectors.zero.style,
                                gapPx: parseInt(e.target.value) || 16
                              }
                            }
                          }
                        })}
                        className="w-full p-2 border border-orange-200 rounded text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-orange-700 mb-1">Margin Top (px)</label>
                      <input
                        type="number"
                        value={siteConfig.selectors?.zero?.style?.marginTopPx || 16}
                        onChange={(e) => setSiteConfig({
                          ...siteConfig,
                          selectors: {
                            ...siteConfig.selectors,
                            zero: {
                              ...siteConfig.selectors.zero,
                              style: {
                                ...siteConfig.selectors.zero.style,
                                marginTopPx: parseInt(e.target.value) || 16
                              }
                            }
                          }
                        })}
                        className="w-full p-2 border border-orange-200 rounded text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-orange-700 mb-1">Card Width</label>
                      <input
                        type="text"
                        value={siteConfig.selectors?.zero?.style?.cardWidth || "100%"}
                        onChange={(e) => setSiteConfig({
                          ...siteConfig,
                          selectors: {
                            ...siteConfig.selectors,
                            zero: {
                              ...siteConfig.selectors.zero,
                              style: {
                                ...siteConfig.selectors.zero.style,
                                cardWidth: e.target.value || "100%"
                              }
                            }
                          }
                        })}
                        placeholder="100%, 250px, etc"
                        className="w-full p-2 border border-orange-200 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Native Card Configuration */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Native Card Configuration</h4>
              <p className="text-xs text-gray-500 mb-3">
                Choose one method: Use <strong>Clone Selector</strong> to copy from DOM, OR paste <strong>Card Template HTML</strong> below
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    🎯 Clone From Selector (Method 1)
                  </label>
                  <input
                    type="text"
                    value={siteConfig.nativeCard.cloneFromSelector}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      nativeCard: {
                        ...siteConfig.nativeCard,
                        cloneFromSelector: e.target.value
                      }
                    })}
                    placeholder="e.g., ul.products li.product"
                    className="w-full p-2 border border-gray-200 rounded text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    CSS selector to clone existing product card from the page
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <label className="block text-sm font-bold text-blue-900">
                        📋 cardTemplate - Card HTML (Method 2)
                      </label>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="useCustomTemplate"
                          checked={siteConfig.nativeCard?.useCustomTemplate || false}
                          onChange={(e) => setSiteConfig({
                            ...siteConfig,
                            nativeCard: {
                              ...siteConfig.nativeCard,
                              useCustomTemplate: e.target.checked
                            }
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="useCustomTemplate" className="mr-2 text-xs text-blue-800 font-semibold">
                          🎯 Use Custom Template
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowTemplateConverter(!showTemplateConverter)}
                        className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded hover:bg-purple-700 transition-colors shadow-sm"
                      >
                        🔄 Convert HTML
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const exampleTemplate = `<li class="grid__item">
  <div class="card-wrapper">
    <a href="" class="card__link">
      <img src="" alt="" class="card__image">
      <span class="card__title"></span>
      <span class="price"></span>
    </a>
  </div>
</li>`;
                          setSiteConfig({
                            ...siteConfig,
                            nativeCard: {
                              ...siteConfig.nativeCard,
                              cardTemplate: exampleTemplate
                            }
                          });
                        }}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        📝 Load Example
                      </button>
                    </div>
                  </div>

                  {/* Template Converter */}
                  {showTemplateConverter && (
                    <div className="mb-4 p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
                      <h5 className="text-sm font-bold text-purple-900 mb-2">🔄 HTML to Template Converter</h5>
                      <p className="text-xs text-purple-700 mb-3">
                        הדבק HTML של כרטיס מוצר אמיתי (עם תמונות, מחירים, קישורים) והמערכת תמיר אותו אוטומטית ל-template עם {`{{placeholders}}`}
                      </p>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-purple-800 mb-1">
                            📥 Raw Card HTML (paste from your site)
                          </label>
                          <textarea
                            value={rawCardHtml}
                            onChange={(e) => setRawCardHtml(e.target.value)}
                            placeholder='<li class="product"><img src="https://example.com/product.jpg"><h3>Product Name</h3><span class="price">₪99</span></li>'
                            rows={6}
                            className="w-full p-3 border-2 border-purple-300 rounded-lg text-xs font-mono bg-white focus:ring-2 focus:ring-purple-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleConvertTemplate}
                          className="w-full px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-md"
                        >
                          🪄 Convert to Template
                        </button>

                        {convertedTemplate && (
                          <div>
                            <label className="block text-xs font-semibold text-green-800 mb-1">
                              ✅ Converted Template (ready to use!)
                            </label>
                            <textarea
                              value={convertedTemplate}
                              readOnly
                              rows={8}
                              className="w-full p-3 border-2 border-green-400 rounded-lg text-xs font-mono bg-green-50"
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                type="button"
                                onClick={handleUseConvertedTemplate}
                                className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
                              >
                                ✅ Use This Template
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(convertedTemplate);
                                  alert('📋 Copied to clipboard!');
                                }}
                                className="px-4 py-2 bg-gray-600 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                              >
                                📋 Copy
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-blue-700 mb-3 font-medium">
                    💡 Paste your product card HTML here. Leave empty attributes (href="", src="") - they'll be filled automatically.
                  </p>
                  <textarea
                    value={siteConfig.nativeCard.cardTemplate || ''}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      nativeCard: {
                        ...siteConfig.nativeCard,
                        cardTemplate: e.target.value
                      }
                    })}
                    placeholder='<li class="product"><a href=""><img src="" alt=""><h3></h3><span class="price"></span></a></li>'
                    rows="8"
                    className="w-full p-3 border-2 border-blue-400 rounded-lg text-sm font-mono bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 shadow-inner"
                  />
                  <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                    <p className="text-xs text-gray-700">
                      ⚙️ <strong>Priority Order:</strong>
                    </p>
                    <ol className="text-xs text-gray-600 mt-1 mr-4 space-y-0.5">
                      <li>1️⃣ <strong>cardTemplate</strong> (this field) - if provided</li>
                      <li>2️⃣ localStorage template - from previous search</li>
                      <li>3️⃣ DOM cloning - using cloneFromSelector above</li>
                    </ol>
                  </div>
                </div>

                <div className="pl-4 border-l-2 border-indigo-200">
                  <h5 className="text-xs font-semibold text-gray-600 mb-2">Element Mapping</h5>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Title Selector</label>
                      <input
                        type="text"
                        value={siteConfig.nativeCard.map.titleSelector}
                        onChange={(e) => setSiteConfig({
                          ...siteConfig,
                          nativeCard: {
                            ...siteConfig.nativeCard,
                            map: {
                              ...siteConfig.nativeCard.map,
                              titleSelector: e.target.value
                            }
                          }
                        })}
                        placeholder=".woocommerce-loop-product__title"
                        className="w-full p-2 border border-gray-200 rounded text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Price Selector</label>
                      <input
                        type="text"
                        value={siteConfig.nativeCard.map.priceSelector}
                        onChange={(e) => setSiteConfig({
                          ...siteConfig,
                          nativeCard: {
                            ...siteConfig.nativeCard,
                            map: {
                              ...siteConfig.nativeCard.map,
                              priceSelector: e.target.value
                            }
                          }
                        })}
                        placeholder=".price"
                        className="w-full p-2 border border-gray-200 rounded text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Image Selector</label>
                      <input
                        type="text"
                        value={siteConfig.nativeCard.map.imageSelector}
                        onChange={(e) => setSiteConfig({
                          ...siteConfig,
                          nativeCard: {
                            ...siteConfig.nativeCard,
                            map: {
                              ...siteConfig.nativeCard.map,
                              imageSelector: e.target.value
                            }
                          }
                        })}
                        placeholder="img"
                        className="w-full p-2 border border-gray-200 rounded text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Link Selector</label>
                      <input
                        type="text"
                        value={siteConfig.nativeCard.map.linkSelector}
                        onChange={(e) => {
                          console.log('Link selector value:', e.target.value);
                          setSiteConfig({
                            ...siteConfig,
                            nativeCard: {
                              ...siteConfig.nativeCard,
                              map: {
                                ...siteConfig.nativeCard.map,
                                linkSelector: e.target.value
                              }
                            }
                          });
                        }}
                        placeholder="a"
                        className="w-full p-2 border border-gray-200 rounded text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    🧹 Cleanup Selectors (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={Array.isArray(siteConfig.nativeCard.cleanupSelectors) ? siteConfig.nativeCard.cleanupSelectors.join(', ') : siteConfig.nativeCard.cleanupSelectors}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      nativeCard: {
                        ...siteConfig.nativeCard,
                        cleanupSelectors: e.target.value
                      }
                    })}
                    onBlur={(e) => {
                      const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      setSiteConfig({
                        ...siteConfig,
                        nativeCard: {
                          ...siteConfig.nativeCard,
                          cleanupSelectors: arr
                        }
                      });
                    }}
                    placeholder="e.g., .card__badge, .sale-badge, .quick-add-button, [data-quick-add]"
                    className="w-full p-2 border border-gray-200 rounded text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Elements to remove from cloned/template cards (badges, buttons, etc.)
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="disableAddToCart"
                      checked={siteConfig.nativeCard.disableAddToCart}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        nativeCard: {
                          ...siteConfig.nativeCard,
                          disableAddToCart: e.target.checked
                        }
                      })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="disableAddToCart" className="mr-2 text-xs text-gray-700">
                      Disable Add to Cart
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="disablePostFix"
                      checked={siteConfig.nativeCard.disablePostFix || false}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        nativeCard: {
                          ...siteConfig.nativeCard,
                          disablePostFix: e.target.checked
                        }
                      })}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <label htmlFor="disablePostFix" className="mr-2 text-xs text-gray-700">
                      🚫 Disable PostFix
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Behavior Configuration */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Behavior Settings</h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Inject Position</label>
                  <select
                    value={siteConfig.behavior.injectPosition}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      behavior: {
                        ...siteConfig.behavior,
                        injectPosition: e.target.value
                      }
                    })}
                    className="w-full p-2 border border-gray-200 rounded text-sm"
                  >
                    <option value="prepend">Prepend</option>
                    <option value="append">Append</option>
                    <option value="afterNth">After Nth</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Inject Count</label>
                  <input
                    type="number"
                    value={siteConfig.behavior.injectCount}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      behavior: {
                        ...siteConfig.behavior,
                        injectCount: parseInt(e.target.value) || 6
                      }
                    })}
                    className="w-full p-2 border border-gray-200 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fade Duration (ms)</label>
                  <input
                    type="number"
                    value={siteConfig.behavior.fadeMs}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      behavior: {
                        ...siteConfig.behavior,
                        fadeMs: parseInt(e.target.value) || 260
                      }
                    })}
                    className="w-full p-2 border border-gray-200 rounded text-sm"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showLoader"
                    checked={siteConfig.behavior.loader}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      behavior: {
                        ...siteConfig.behavior,
                        loader: e.target.checked
                      }
                    })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="showLoader" className="mr-2 text-xs text-gray-700">
                    Show Loader
                  </label>
                </div>
              </div>
            </div>

            {/* Features Configuration */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Features</h4>

              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="rerankBoost"
                    checked={siteConfig.features.rerankBoost}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      features: {
                        ...siteConfig.features,
                        rerankBoost: e.target.checked
                      }
                    })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="rerankBoost" className="mr-2 text-xs text-gray-700">
                    Rerank Boost
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="injectIntoGrid"
                    checked={siteConfig.features.injectIntoGrid}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      features: {
                        ...siteConfig.features,
                        injectIntoGrid: e.target.checked
                      }
                    })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="injectIntoGrid" className="mr-2 text-xs text-gray-700">
                    Inject Into Grid
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="zeroReplace"
                    checked={siteConfig.features.zeroReplace}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      features: {
                        ...siteConfig.features,
                        zeroReplace: e.target.checked
                      }
                    })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="zeroReplace" className="mr-2 text-xs text-gray-700">
                    Zero Results Replace
                  </label>
                </div>

                <div className="flex items-center pt-2 border-t border-gray-200 mt-2">
                  <input
                    type="checkbox"
                    id="featureDisabled"
                    checked={siteConfig.features.disabled}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      features: {
                        ...siteConfig.features,
                        disabled: e.target.checked
                      }
                    })}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="featureDisabled" className="mr-2 text-xs font-bold text-red-700">
                    Disable All Features (Manual Kill-switch)
                  </label>
                </div>
              </div>
            </div>

            {/* Placeholder Rotation Configuration */}
            <div className="mb-4 p-4 bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-purple-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-purple-900">🔄 Placeholder Rotation</h4>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="placeholderEnabled"
                    checked={siteConfig.placeholderRotate?.enabled ?? true}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      placeholderRotate: {
                        ...siteConfig.placeholderRotate,
                        enabled: e.target.checked
                      }
                    })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="placeholderEnabled" className="mr-2 text-xs text-purple-700 font-medium">
                    Enable
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-purple-800 mb-1">
                    Placeholders (אחד בכל שורה)
                  </label>
                  <textarea
                    value={Array.isArray(siteConfig.placeholderRotate?.placeholders)
                      ? siteConfig.placeholderRotate.placeholders.join('\n')
                      : (typeof siteConfig.placeholderRotate?.placeholders === 'string'
                        ? siteConfig.placeholderRotate.placeholders
                        : '')}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      placeholderRotate: {
                        ...siteConfig.placeholderRotate,
                        placeholders: e.target.value  // Keep as string while typing
                      }
                    })}
                    onBlur={(e) => {
                      // Convert to array only on blur
                      const arr = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
                      setSiteConfig({
                        ...siteConfig,
                        placeholderRotate: {
                          ...siteConfig.placeholderRotate,
                          placeholders: arr
                        }
                      });
                    }}
                    placeholder="חפש מוצרים…&#10;נסו: טבעת כסף&#10;נסו: שרשרת עדינה"
                    rows="5"
                    className="w-full p-2 border border-purple-200 rounded text-sm font-mono"
                  />
                  <p className="text-xs text-purple-600 mt-1">
                    לחץ <kbd className="px-1 py-0.5 bg-purple-100 rounded">Enter</kbd> לשורה חדשה • כל שורה = placeholder אחד
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-purple-700 mb-1">Interval (ms)</label>
                    <input
                      type="number"
                      value={siteConfig.placeholderRotate?.intervalMs ?? 2400}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        placeholderRotate: {
                          ...siteConfig.placeholderRotate,
                          intervalMs: parseInt(e.target.value) || 2400
                        }
                      })}
                      className="w-full p-2 border border-purple-200 rounded text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-purple-700 mb-1">Fade Duration (ms)</label>
                    <input
                      type="number"
                      value={siteConfig.placeholderRotate?.fadeMs ?? 220}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        placeholderRotate: {
                          ...siteConfig.placeholderRotate,
                          fadeMs: parseInt(e.target.value) || 220
                        }
                      })}
                      className="w-full p-2 border border-purple-200 rounded text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4 space-x-reverse">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="pauseOnFocus"
                      checked={siteConfig.placeholderRotate?.pauseOnFocus ?? true}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        placeholderRotate: {
                          ...siteConfig.placeholderRotate,
                          pauseOnFocus: e.target.checked
                        }
                      })}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label htmlFor="pauseOnFocus" className="mr-2 text-xs text-purple-700">
                      Pause on Focus
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="onlyIfEmpty"
                      checked={siteConfig.placeholderRotate?.onlyIfEmpty ?? true}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        placeholderRotate: {
                          ...siteConfig.placeholderRotate,
                          onlyIfEmpty: e.target.checked
                        }
                      })}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label htmlFor="onlyIfEmpty" className="mr-2 text-xs text-purple-700">
                      Only if Empty
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Consent Popup Configuration */}
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-blue-900">🍪 Consent Popup</h4>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="consentEnabled"
                    checked={siteConfig.consent?.enabled ?? true}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      consent: {
                        ...siteConfig.consent,
                        enabled: e.target.checked
                      }
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="consentEnabled" className="mr-2 text-xs text-blue-700 font-medium">
                    Enable
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={siteConfig.consent?.title ?? ''}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      consent: {
                        ...siteConfig.consent,
                        title: e.target.value
                      }
                    })}
                    placeholder="🍪 חיפוש מותאם אישית"
                    className="w-full p-2 border border-blue-200 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">Text</label>
                  <textarea
                    value={siteConfig.consent?.text ?? ''}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      consent: {
                        ...siteConfig.consent,
                        text: e.target.value
                      }
                    })}
                    placeholder="מאשרים ל־Semantix לשמור סשן לשיפור התוצאות?"
                    rows="2"
                    className="w-full p-2 border border-blue-200 rounded text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">Accept Button</label>
                    <input
                      type="text"
                      value={siteConfig.consent?.acceptText ?? ''}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        consent: {
                          ...siteConfig.consent,
                          acceptText: e.target.value
                        }
                      })}
                      placeholder="כן, אשר"
                      className="w-full p-2 border border-blue-200 rounded text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">Decline Button</label>
                    <input
                      type="text"
                      value={siteConfig.consent?.declineText ?? ''}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        consent: {
                          ...siteConfig.consent,
                          declineText: e.target.value
                        }
                      })}
                      placeholder="לא, תודה"
                      className="w-full p-2 border border-blue-200 rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Click Tracking Configuration */}
            <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-green-900">📊 Click Tracking</h4>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="trackingEnabled"
                    checked={siteConfig.clickTracking?.enabled ?? true}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      clickTracking: {
                        ...siteConfig.clickTracking,
                        enabled: e.target.checked
                      }
                    })}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="trackingEnabled" className="mr-2 text-xs text-green-700 font-medium">
                    Enable
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div className="pt-2">
                  <label className="block text-xs font-medium text-green-700 mb-1">Add to Cart Button Selector</label>
                  <input
                    type="text"
                    value={siteConfig.clickTracking?.addToCartSelector || ''}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      clickTracking: {
                        ...siteConfig.clickTracking,
                        addToCartSelector: e.target.value
                      }
                    })}
                    placeholder="e.g., .add_to_cart_button, button[name='add']"
                    className="w-full p-2 border border-green-200 rounded text-sm bg-white focus:ring-2 focus:ring-green-500 transition-all shadow-sm"
                  />
                </div>

                <div className="flex items-center space-x-4 space-x-reverse">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="trackNativeClicks"
                      checked={siteConfig.clickTracking?.trackNativeClicks ?? true}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        clickTracking: {
                          ...siteConfig.clickTracking,
                          trackNativeClicks: e.target.checked
                        }
                      })}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="trackNativeClicks" className="mr-2 text-xs text-green-700">
                      Track Native Clicks
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="universalMode"
                      checked={siteConfig.clickTracking?.universalMode ?? false}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        clickTracking: {
                          ...siteConfig.clickTracking,
                          universalMode: e.target.checked
                        }
                      })}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="universalMode" className="mr-2 text-xs text-green-700">
                      Universal Mode
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="forceNavDelay"
                      checked={siteConfig.clickTracking?.forceNavDelay ?? true}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        clickTracking: {
                          ...siteConfig.clickTracking,
                          forceNavDelay: e.target.checked
                        }
                      })}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="forceNavDelay" className="mr-2 text-xs text-green-700">
                      Force Nav Delay
                    </label>
                  </div>
                </div>

                {/* Universal Link Selector - shown when universalMode is enabled */}
                {siteConfig.clickTracking?.universalMode && (
                  <div>
                    <label className="block text-xs font-medium text-green-700 mb-1">
                      Universal Link Selector
                      <span className="text-green-600 font-normal mr-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={siteConfig.clickTracking?.universalLinkSelector ?? ''}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        clickTracking: {
                          ...siteConfig.clickTracking,
                          universalLinkSelector: e.target.value
                        }
                      })}
                      placeholder='a.my-product-link, .product a[href*="/products/"]'
                      className="w-full p-2 border border-green-200 rounded text-sm font-mono"
                    />
                    <p className="text-xs text-green-600 mt-1">
                      CSS selector לזיהוי כל הקישורים למוצרים באתר (למשל: <code className="bg-green-100 px-1 rounded">a.product-link</code>)
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-green-700 mb-1">Delay (ms)</label>
                    <input
                      type="number"
                      value={siteConfig.clickTracking?.forceNavDelayMs ?? 80}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        clickTracking: {
                          ...siteConfig.clickTracking,
                          forceNavDelayMs: parseInt(e.target.value) || 80
                        }
                      })}
                      className="w-full p-2 border border-green-200 rounded text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-green-700 mb-1">Queue Max</label>
                    <input
                      type="number"
                      value={siteConfig.clickTracking?.queueMax ?? 25}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        clickTracking: {
                          ...siteConfig.clickTracking,
                          queueMax: parseInt(e.target.value) || 25
                        }
                      })}
                      className="w-full p-2 border border-green-200 rounded text-sm"
                    />
                  </div>
                </div>

                {/* Cart Interceptor */}
                <div className="mt-3 p-3 bg-white border-2 border-emerald-400 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-xs font-semibold text-green-800">Cart Interceptor</h5>
                    <div className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        id="cartInterceptorEnabled"
                        checked={siteConfig.clickTracking?.cartInterceptor?.enabled ?? true}
                        onChange={(e) => setSiteConfig({
                          ...siteConfig,
                          clickTracking: {
                            ...siteConfig.clickTracking,
                            cartInterceptor: {
                              ...siteConfig.clickTracking.cartInterceptor,
                              enabled: e.target.checked
                            }
                          }
                        })}
                        className="h-3 w-3 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <label htmlFor="cartInterceptorEnabled" className="text-xs text-green-700">Enabled</label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-green-700 mb-1">URL Patterns (comma-separated)</label>
                      <input
                        type="text"
                        value={Array.isArray(siteConfig.clickTracking?.cartInterceptor?.urlPatterns) ? siteConfig.clickTracking.cartInterceptor.urlPatterns.join(', ') : ''}
                        onChange={(e) => setSiteConfig({
                          ...siteConfig,
                          clickTracking: {
                            ...siteConfig.clickTracking,
                            cartInterceptor: {
                              ...siteConfig.clickTracking.cartInterceptor,
                              urlPatterns: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                            }
                          }
                        })}
                        placeholder="/cart/add, /api/basket"
                        className="w-full p-2 border border-green-200 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-green-700 mb-1">Checkout Patterns (comma-separated)</label>
                      <input
                        type="text"
                        value={Array.isArray(siteConfig.clickTracking?.cartInterceptor?.checkoutPatterns) ? siteConfig.clickTracking.cartInterceptor.checkoutPatterns.join(', ') : ''}
                        onChange={(e) => setSiteConfig({
                          ...siteConfig,
                          clickTracking: {
                            ...siteConfig.clickTracking,
                            cartInterceptor: {
                              ...siteConfig.clickTracking.cartInterceptor,
                              checkoutPatterns: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                            }
                          }
                        })}
                        placeholder="/checkout, /order/create"
                        className="w-full p-2 border border-green-200 rounded text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-green-700 mb-1">Product ID Field</label>
                        <input
                          type="text"
                          value={siteConfig.clickTracking?.cartInterceptor?.productIdField || ''}
                          onChange={(e) => setSiteConfig({
                            ...siteConfig,
                            clickTracking: {
                              ...siteConfig.clickTracking,
                              cartInterceptor: {
                                ...siteConfig.clickTracking.cartInterceptor,
                                productIdField: e.target.value
                              }
                            }
                          })}
                          placeholder="product_id"
                          className="w-full p-2 border border-green-200 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-green-700 mb-1">Quantity Field</label>
                        <input
                          type="text"
                          value={siteConfig.clickTracking?.cartInterceptor?.quantityField || ''}
                          onChange={(e) => setSiteConfig({
                            ...siteConfig,
                            clickTracking: {
                              ...siteConfig.clickTracking,
                              cartInterceptor: {
                                ...siteConfig.clickTracking.cartInterceptor,
                                quantityField: e.target.value
                              }
                            }
                          })}
                          placeholder="quantity"
                          className="w-full p-2 border border-green-200 rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Texts Configuration */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Text Labels</h4>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Loader Text</label>
                <input
                  type="text"
                  value={siteConfig.texts.loader}
                  onChange={(e) => setSiteConfig({
                    ...siteConfig,
                    texts: {
                      ...siteConfig.texts,
                      loader: e.target.value
                    }
                  })}
                  placeholder="טוען תוצאות חכמות…"
                  className="w-full p-2 border border-gray-200 rounded text-sm"
                />
              </div>

              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Replace No Results Text</label>
                <input
                  type="text"
                  value={siteConfig.zero?.replaceNoResultsText || ''}
                  onChange={(e) => setSiteConfig({
                    ...siteConfig,
                    zero: {
                      ...siteConfig.zero,
                      replaceNoResultsText: e.target.value
                    }
                  })}
                  placeholder="מחפש תוצאות חכמות..."
                  className="w-full p-2 border border-gray-200 rounded text-sm"
                />
              </div>

              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Replace No Results Selector</label>
                <input
                  type="text"
                  value={siteConfig.zero?.replaceNoResultsSelector || ''}
                  onChange={(e) => setSiteConfig({
                    ...siteConfig,
                    zero: {
                      ...siteConfig.zero,
                      replaceNoResultsSelector: e.target.value
                    }
                  })}
                  placeholder="h2.no-results-heading"
                  className="w-full p-2 border border-gray-200 rounded text-sm"
                />
              </div>
            </div>

            {/* Branding Configuration */}
            <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg">
              <h4 className="text-sm font-semibold text-purple-900 mb-3">🎨 Branding</h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-purple-700 mb-1">Logo URL</label>
                  <input
                    type="text"
                    value={siteConfig.branding?.logoUrl || ''}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      branding: {
                        ...siteConfig.branding,
                        logoUrl: e.target.value
                      }
                    })}
                    placeholder="https://semantix-ai.com/powered.png"
                    className="w-full p-2 border border-purple-200 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-purple-700 mb-1">Loading Text</label>
                  <input
                    type="text"
                    value={siteConfig.branding?.loadingText || ''}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      branding: {
                        ...siteConfig.branding,
                        loadingText: e.target.value
                      }
                    })}
                    placeholder="Semantix AI מחפש עבורך..."
                    className="w-full p-2 border border-purple-200 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-purple-700 mb-1">Logo Size (px)</label>
                  <input
                    type="number"
                    value={siteConfig.branding?.logoSize || 120}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      branding: {
                        ...siteConfig.branding,
                        logoSize: parseInt(e.target.value) || 120
                      }
                    })}
                    placeholder="120"
                    className="w-full p-2 border border-purple-200 rounded text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Autocomplete Footer Configuration */}
            <div className="mb-4 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-lg">
              <h4 className="text-sm font-semibold text-cyan-900 mb-3">🔍 Autocomplete Footer</h4>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autocompleteFooterEnabled"
                    checked={siteConfig.autocompleteFooter?.enabled ?? true}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      autocompleteFooter: {
                        ...siteConfig.autocompleteFooter,
                        enabled: e.target.checked
                      }
                    })}
                    className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autocompleteFooterEnabled" className="mr-2 text-xs text-cyan-800 font-medium">
                    Enable Autocomplete Footer
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-cyan-700 mb-1">Footer Text</label>
                  <input
                    type="text"
                    value={siteConfig.autocompleteFooter?.text || ''}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      autocompleteFooter: {
                        ...siteConfig.autocompleteFooter,
                        text: e.target.value
                      }
                    })}
                    placeholder="מופעל על ידי Semantix AI ✨"
                    className="w-full p-2 border border-cyan-200 rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-cyan-700 mb-1">Container Selector</label>
                  <input
                    type="text"
                    value={siteConfig.autocompleteFooter?.selector || ''}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      autocompleteFooter: {
                        ...siteConfig.autocompleteFooter,
                        selector: e.target.value
                      }
                    })}
                    placeholder=".autocomplete-dropdown"
                    className="w-full p-2 border border-cyan-200 rounded text-sm font-mono"
                  />
                  <p className="text-xs text-cyan-600 mt-1">
                    CSS selector of the autocomplete dropdown container
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-cyan-700 mb-1">Font Size</label>
                  <input
                    type="text"
                    value={siteConfig.autocompleteFooter?.fontSize || '13px'}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      autocompleteFooter: {
                        ...siteConfig.autocompleteFooter,
                        fontSize: e.target.value
                      }
                    })}
                    placeholder="13px"
                    className="w-full p-2 border border-cyan-200 rounded text-sm"
                  />
                  <p className="text-xs text-cyan-600 mt-1">
                    Font size for the footer text (e.g., 13px, 1rem)
                  </p>
                </div>
              </div>
            </div>

            {/* AI Badge Configuration */}
            <div className="mb-4 p-4 bg-gradient-to-r from-violet-50 to-purple-50 border-2 border-violet-300 rounded-lg shadow-sm">
              <h4 className="text-sm font-semibold text-violet-900 mb-1">✨ AI Badge</h4>
              <p className="text-xs text-violet-600 mb-3">סמן AI אלגנטי על כרטיסי המוצרים</p>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="aiBadgeEnabled"
                    checked={siteConfig.aiBadge?.enabled ?? true}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      aiBadge: {
                        ...siteConfig.aiBadge,
                        enabled: e.target.checked
                      }
                    })}
                    className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                  />
                  <label htmlFor="aiBadgeEnabled" className="mr-2 text-xs text-violet-800 font-medium">
                    Enable AI Badge
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-violet-700 mb-1">Text</label>
                    <input
                      type="text"
                      value={siteConfig.aiBadge?.text || 'AI'}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        aiBadge: {
                          ...siteConfig.aiBadge,
                          text: e.target.value
                        }
                      })}
                      placeholder="AI"
                      className="w-full p-2 border border-violet-200 rounded text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-violet-700 mb-1">Position</label>
                    <select
                      value={siteConfig.aiBadge?.position || 'top-right'}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        aiBadge: {
                          ...siteConfig.aiBadge,
                          position: e.target.value
                        }
                      })}
                      className="w-full p-2 border border-violet-200 rounded text-sm"
                    >
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-violet-700 mb-1">Background</label>
                    <input
                      type="text"
                      value={siteConfig.aiBadge?.backgroundColor || 'rgba(139, 92, 246, 0.1)'}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        aiBadge: {
                          ...siteConfig.aiBadge,
                          backgroundColor: e.target.value
                        }
                      })}
                      placeholder="rgba(...)"
                      className="w-full p-2 border border-violet-200 rounded text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-violet-700 mb-1">Text Color</label>
                    <input
                      type="text"
                      value={siteConfig.aiBadge?.textColor || '#8b5cf6'}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        aiBadge: {
                          ...siteConfig.aiBadge,
                          textColor: e.target.value
                        }
                      })}
                      placeholder="#8b5cf6"
                      className="w-full p-2 border border-violet-200 rounded text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-violet-700 mb-1">Border Color</label>
                    <input
                      type="text"
                      value={siteConfig.aiBadge?.borderColor || '#8b5cf6'}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        aiBadge: {
                          ...siteConfig.aiBadge,
                          borderColor: e.target.value
                        }
                      })}
                      placeholder="#8b5cf6"
                      className="w-full p-2 border border-violet-200 rounded text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-violet-700 mb-1">Border Width</label>
                    <input
                      type="text"
                      value={siteConfig.aiBadge?.borderWidth || '1px'}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        aiBadge: {
                          ...siteConfig.aiBadge,
                          borderWidth: e.target.value
                        }
                      })}
                      placeholder="1px"
                      className="w-full p-2 border border-violet-200 rounded text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-violet-700 mb-1">Border Style</label>
                    <select
                      value={siteConfig.aiBadge?.borderStyle || 'solid'}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        aiBadge: {
                          ...siteConfig.aiBadge,
                          borderStyle: e.target.value
                        }
                      })}
                      className="w-full p-2 border border-violet-200 rounded text-xs"
                    >
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-violet-700 mb-1">Border Radius</label>
                    <input
                      type="text"
                      value={siteConfig.aiBadge?.borderRadius || '8px'}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        aiBadge: {
                          ...siteConfig.aiBadge,
                          borderRadius: e.target.value
                        }
                      })}
                      placeholder="8px"
                      className="w-full p-2 border border-violet-200 rounded text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-violet-700 mb-1">Z-Index</label>
                    <input
                      type="number"
                      value={siteConfig.aiBadge?.zIndex || 10}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        aiBadge: {
                          ...siteConfig.aiBadge,
                          zIndex: parseInt(e.target.value) || 10
                        }
                      })}
                      placeholder="10"
                      className="w-full p-2 border border-violet-200 rounded text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-violet-700 mb-1">Font Size</label>
                    <input
                      type="text"
                      value={siteConfig.aiBadge?.fontSize || '11px'}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        aiBadge: {
                          ...siteConfig.aiBadge,
                          fontSize: e.target.value
                        }
                      })}
                      placeholder="11px"
                      className="w-full p-2 border border-violet-200 rounded text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-violet-700 mb-1">Font Weight</label>
                    <select
                      value={siteConfig.aiBadge?.fontWeight || '600'}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        aiBadge: {
                          ...siteConfig.aiBadge,
                          fontWeight: e.target.value
                        }
                      })}
                      className="w-full p-2 border border-violet-200 rounded text-xs"
                    >
                      <option value="400">Normal (400)</option>
                      <option value="500">Medium (500)</option>
                      <option value="600">Semibold (600)</option>
                      <option value="700">Bold (700)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-violet-700 mb-1">Padding</label>
                    <input
                      type="text"
                      value={siteConfig.aiBadge?.padding || '3px 8px'}
                      onChange={(e) => setSiteConfig({
                        ...siteConfig,
                        aiBadge: {
                          ...siteConfig.aiBadge,
                          padding: e.target.value
                        }
                      })}
                      placeholder="3px 8px"
                      className="w-full p-2 border border-violet-200 rounded text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-violet-700 mb-1">Box Shadow</label>
                  <input
                    type="text"
                    value={siteConfig.aiBadge?.boxShadow || '0 4px 12px rgba(139, 92, 246, 0.25)'}
                    onChange={(e) => setSiteConfig({
                      ...siteConfig,
                      aiBadge: {
                        ...siteConfig.aiBadge,
                        boxShadow: e.target.value
                      }
                    })}
                    placeholder="0 4px 12px rgba(139, 92, 246, 0.25)"
                    className="w-full p-2 border border-violet-200 rounded text-xs font-mono"
                  />
                  <p className="text-xs text-violet-600 mt-1">
                    צל חזק יותר יוצר אפקט 'צף' אלגנטי ✨
                  </p>
                </div>

                {/* Preview */}
                <div className="mt-4 p-4 bg-white border-2 border-violet-200 rounded-lg">
                  <p className="text-xs font-medium text-violet-700 mb-2">👁️ Preview:</p>
                  <div className="relative w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400 text-xs">Product Card</span>
                    <div
                      style={{
                        position: 'absolute',
                        [siteConfig.aiBadge?.position?.includes('top') ? 'top' : 'bottom']: '8px',
                        [siteConfig.aiBadge?.position?.includes('left') ? 'left' : 'right']: '8px',
                        backgroundColor: siteConfig.aiBadge?.backgroundColor || 'rgba(139, 92, 246, 0.1)',
                        color: siteConfig.aiBadge?.textColor || '#8b5cf6',
                        border: `${siteConfig.aiBadge?.borderWidth || '1px'} ${siteConfig.aiBadge?.borderStyle || 'solid'} ${siteConfig.aiBadge?.borderColor || '#8b5cf6'}`,
                        borderRadius: siteConfig.aiBadge?.borderRadius || '8px',
                        fontSize: siteConfig.aiBadge?.fontSize || '11px',
                        fontWeight: siteConfig.aiBadge?.fontWeight || '600',
                        padding: siteConfig.aiBadge?.padding || '3px 8px',
                        boxShadow: siteConfig.aiBadge?.boxShadow || '0 4px 12px rgba(139, 92, 246, 0.25)',
                        zIndex: siteConfig.aiBadge?.zIndex || 10
                      }}
                    >
                      {siteConfig.aiBadge?.text || 'AI'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Debug Configuration */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Debug Settings</h4>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="debugEnabled"
                  checked={siteConfig.debug.enabled}
                  onChange={(e) => setSiteConfig({
                    ...siteConfig,
                    debug: {
                      ...siteConfig.debug,
                      enabled: e.target.checked
                    }
                  })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="debugEnabled" className="mr-2 text-xs text-gray-700">
                  Enable Debug Mode
                </label>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveCredentials}
            disabled={saveCredentialsStatus === 'loading'}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {saveCredentialsStatus === 'loading' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : saveCredentialsStatus === 'success' ? (
              <CheckCircle className="mr-2 h-4 w-4" />
            ) : saveCredentialsStatus === 'error' ? (
              <XCircle className="mr-2 h-4 w-4" />
            ) : null}
            Save Credentials
          </button>
          {saveCredentialsStatus === 'success' && (
            <p className="text-green-600 text-sm">✓ Credentials saved successfully</p>
          )}
          {saveCredentialsStatus === 'error' && (
            <p className="text-red-600 text-sm">✗ Failed to save credentials</p>
          )}
        </div>
      )}

      {/* Sync Products Section */}
      {
        userData && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div className="border-b border-gray-100 p-5">
              <h2 className="text-lg font-semibold text-gray-800">Sync Products</h2>
              <p className="text-sm text-gray-500 mt-1">
                Trigger an internal sync to fetch and process products from the store.
                This will use the user's stored credentials to sync products directly.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="mr-3">
                    <h3 className="text-sm font-medium text-blue-800">Internal Sync</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      This will fetch products from the store using the user's credentials and process them.
                      The sync runs internally without requiring external webhooks or user interaction.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSyncProducts}
                disabled={syncStatus === 'loading' || !userData || !apiKey}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {syncStatus === 'loading' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : syncStatus === 'success' ? (
                  <CheckCircle className="mr-2 h-4 w-4" />
                ) : syncStatus === 'error' ? (
                  <XCircle className="mr-2 h-4 w-4" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {syncStatus === 'loading' ? 'Syncing Products...' : 'Sync Products from Store'}
              </button>
              {syncStatus === 'success' && (
                <p className="text-green-600 text-sm text-center">✓ Product sync completed successfully!</p>
              )}
              {syncStatus === 'error' && (
                <p className="text-red-600 text-sm text-center">✗ Error during product sync. Check logs below.</p>
              )}

              {/* Real-time sync logs */}
              {(syncStatus === 'loading' || syncLogs.length > 0) && (
                <div className="mt-4 bg-gray-900 rounded-lg p-4 max-h-80 overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Sync Logs</h4>
                    {syncStatus === 'loading' && (
                      <span className="flex items-center text-xs text-yellow-400">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Processing...
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5 font-mono text-xs">
                    {syncLogs.length === 0 && syncStatus === 'loading' && (
                      <p className="text-gray-500">Waiting for first logs...</p>
                    )}
                    {syncLogs.map((log, i) => (
                      <p key={i} className={`${log.includes('❌') ? 'text-red-400' :
                        log.includes('✅') ? 'text-green-400' :
                          log.includes('⚠️') ? 'text-yellow-400' :
                            log.includes('🚀') ? 'text-blue-400' :
                              log.includes('📊') ? 'text-purple-400' :
                                'text-gray-300'
                        }`}>
                        {log}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      }

      {/* Reprocessing Options */}
      {
        userData && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div className="border-b border-gray-100 p-5">
              <h2 className="text-lg font-semibold text-gray-800">Reprocessing Options</h2>
              <p className="text-sm text-gray-500 mt-1">Select which components to reprocess.</p>
            </div>
            <div className="p-6 space-y-4">
              {/* Filter: Only products without soft categories */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-start space-x-3 space-x-reverse">
                    <input
                      type="checkbox"
                      id="onlyWithoutSoftCategories"
                      checked={onlyWithoutSoftCategories}
                      onChange={(e) => setOnlyWithoutSoftCategories(e.target.checked)}
                      className="mt-1 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <label htmlFor="onlyWithoutSoftCategories" className="text-sm font-semibold text-yellow-900 cursor-pointer flex items-center">
                        <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Only Reprocess Products WITHOUT Soft Categories
                      </label>
                      <p className="text-xs text-yellow-800 mt-1">
                        When enabled, only products that are missing soft categories (empty or null) will be reprocessed.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 space-x-reverse border-t border-yellow-200 pt-4">
                    <input
                      type="checkbox"
                      id="onlyUnprocessed"
                      checked={onlyUnprocessed}
                      onChange={(e) => setOnlyUnprocessed(e.target.checked)}
                      className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <label htmlFor="onlyUnprocessed" className="text-sm font-semibold text-indigo-900 cursor-pointer flex items-center">
                        <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reprocess Fresh Unprocessed Products ONLY
                      </label>
                      <p className="text-xs text-indigo-800 mt-1">
                        Target products with NO embeddings and NO existing categories/types. Use this for products that failed initial onboarding.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-700">Select All / Deselect All</span>
                <button
                  onClick={toggleAll}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                  Toggle All
                </button>
              </div>

              {[
                { key: 'reprocessHardCategories', label: 'Hard Categories', description: 'Reprocess main product categories' },
                { key: 'reprocessSoftCategories', label: 'Soft Categories', description: 'Reprocess flexible categorization' },
                { key: 'reprocessTypes', label: 'Product Types', description: 'Reprocess product type classifications' },
                { key: 'reprocessColors', label: 'Colors', description: 'Reprocess product color classifications' },
                { key: 'reprocessVariants', label: 'Variants', description: 'Reprocess product variants (sizes, colors)' },
                { key: 'reprocessEmbeddings', label: 'Embeddings', description: 'Regenerate vector embeddings' },
                { key: 'reprocessDescriptions', label: 'Descriptions', description: 'Retranslate and enrich descriptions' },
                { key: 'translateBeforeEmbedding', label: 'Translation', description: 'Translate to English before embedding' }
              ].map(({ key, label, description }) => (
                <div key={key} className="flex items-start space-x-3 space-x-reverse">
                  <input
                    type="checkbox"
                    id={key}
                    checked={reprocessOptions[key]}
                    onChange={() => toggleOption(key)}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <label htmlFor={key} className="text-sm font-medium text-gray-700 cursor-pointer">
                      {label}
                    </label>
                    <p className="text-xs text-gray-500 mt-1">{description}</p>
                  </div>
                </div>
              ))}

              {/* Incremental Mode: Add new soft categories - ADDITIONAL OPTION */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-start space-x-3 space-x-reverse">
                    <input
                      type="checkbox"
                      id="incrementalMode"
                      checked={incrementalMode}
                      onChange={(e) => setIncrementalMode(e.target.checked)}
                      className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <label htmlFor="incrementalMode" className="text-sm font-semibold text-green-900 cursor-pointer flex items-center">
                        <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        מצב הוספה מצטברת (Incremental Mode) - אפשרות נוספת
                      </label>
                      <p className="text-xs text-green-800 mt-1">
                        הוסף קטגוריות חדשות (רכות ו/או קשיחות) למוצרים מעובדים ללא עיבוד מחדש מלא. זה חוסך זמן ועלויות API.
                        <br />
                        <strong>שים לב:</strong> זה מצב נפרד שעובד במקביל לאפשרויות למעלה.
                      </p>
                    </div>
                  </div>

                  {incrementalMode && (
                    <div className="border-t border-green-200 pt-4 space-y-4">
                      <div>
                        <label htmlFor="incrementalSoftCategories" className="block text-sm font-medium text-green-900 mb-2">
                          קטגוריות רכות חדשות להוספה (מופרדות בפסיקים)
                        </label>
                        <input
                          type="text"
                          id="incrementalSoftCategories"
                          value={incrementalSoftCategories}
                          onChange={(e) => setIncrementalSoftCategories(e.target.value)}
                          placeholder="לדוגמה: מתנה, קיצי, עמיד למים"
                          className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                          dir="rtl"
                        />
                      </div>
                      <div>
                        <label htmlFor="incrementalHardCategories" className="block text-sm font-medium text-green-900 mb-2">
                          קטגוריות קשיחות חדשות להוספה (מופרדות בפסיקים)
                        </label>
                        <input
                          type="text"
                          id="incrementalHardCategories"
                          value={incrementalHardCategories}
                          onChange={(e) => setIncrementalHardCategories(e.target.value)}
                          placeholder="לדוגמה: ביגוד, אלקטרוניקה, ספורט"
                          className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                          dir="rtl"
                        />
                      </div>
                      <div>
                        <label htmlFor="incrementalColors" className="block text-sm font-medium text-green-900 mb-2">
                          צבעים חדשים להוספה (מופרדים בפסיקים)
                        </label>
                        <input
                          type="text"
                          id="incrementalColors"
                          value={incrementalColors}
                          onChange={(e) => setIncrementalColors(e.target.value)}
                          placeholder="לדוגמה: שחור, לבן, זהב"
                          className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                          dir="rtl"
                        />
                      </div>
                      <p className="text-xs text-green-700">
                        💡 טיפ: המערכת תוסיף רק את המאפיינים החדשים למוצרים, מבלי לגעת בקיימים.
                        ניתן להזין קטגוריות רכות, קשיחות, או צבעים.
                      </p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="mr-2">
                            <p className="text-xs text-blue-700">
                              במצב זה, המערכת תעבור רק על מוצרים מעובדים ותוסיף את הקטגוריות החדשות למערך הקיים.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Regular Reprocessing Button */}
              <button
                onClick={handleProcessProducts}
                disabled={processingStatus === 'loading' || !userData || !dbName}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center mt-6"
              >
                {processingStatus === 'loading' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : processingStatus === 'success' ? (
                  <CheckCircle className="mr-2 h-4 w-4" />
                ) : processingStatus === 'error' ? (
                  <XCircle className="mr-2 h-4 w-4" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Start Reprocessing
              </button>
              {processingStatus === 'success' && (
                <p className="text-green-600 text-sm text-center">✓ Product reprocessing initiated successfully!</p>
              )}
              {processingStatus === 'error' && (
                <p className="text-red-600 text-sm text-center">✗ Error initiating product reprocessing</p>
              )}

              {/* Incremental Mode Button - Only shown when incremental mode is enabled */}
              {incrementalMode && (
                <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">או</span>
                    </div>
                  </div>

                  <button
                    onClick={handleIncrementalProcess}
                    disabled={incrementalProcessingStatus === 'loading' || !userData || !dbName}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {incrementalProcessingStatus === 'loading' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : incrementalProcessingStatus === 'success' ? (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    ) : incrementalProcessingStatus === 'error' ? (
                      <XCircle className="mr-2 h-4 w-4" />
                    ) : (
                      <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    )}
                    הוסף קטגוריות חדשות (Incremental)
                  </button>
                  {incrementalProcessingStatus === 'success' && (
                    <p className="text-green-600 text-sm text-center mt-2">✓ הוספת קטגוריות חדשות החלה בהצלחה!</p>
                  )}
                  {incrementalProcessingStatus === 'error' && (
                    <p className="text-red-600 text-sm text-center mt-2">✗ שגיאה בהוספת קטגוריות חדשות</p>
                  )}
                </>
              )}
            </div>
          </div>
        )
      }
    </div>
  );
}
