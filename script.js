// Constants and Global Variables
const API_BASE_URL = "https://api.coingecko.com/api/v3";
let currentCurrency = "usd";
let currentPage = 1;
let totalPages = 5;
let allCoins = [];
let filteredCoins = [];
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let activeTab = 'trending';
let chartInstance = null;

// DOM Elements
const totalMarketCapElement = document.getElementById("total-market-cap");
const totalVolumeElement = document.getElementById("total-volume");
const btcDominanceElement = document.getElementById("btc-dominance");
const cryptoDataElement = document.getElementById("crypto-data");
const searchInput = document.getElementById("search");
const currencySelector = document.getElementById("currency");
const prevPageButton = document.getElementById("prev-page");
const nextPageButton = document.getElementById("next-page");
const pageIndicator = document.getElementById("page-indicator");
const tabButtons = document.querySelectorAll(".tab");
const cryptoModal = document.getElementById("crypto-modal");
const closeModalButton = document.querySelector(".close-modal");
const themeToggleButton = document.querySelector(".theme-toggle");
const addFavoriteButton = document.getElementById("add-favorite");
const periodButtons = document.querySelectorAll(".period-btn");

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

// App Initialization
async function initializeApp() {
    loadThemePreference();
    loadGlobalMarketData();
    await loadCoins();
    updateCoinList();
}

// Event Listeners Setup
function setupEventListeners() {
    // Theme toggle
    themeToggleButton.addEventListener('click', toggleTheme);
    
    // Currency change
    currencySelector.addEventListener('change', (e) => {
        currentCurrency = e.target.value;
        loadGlobalMarketData();
        updateCoinList();
    });
    
    // Search
    searchInput.addEventListener('input', handleSearch);
    
    // Pagination
    prevPageButton.addEventListener('click', goToPrevPage);
    nextPageButton.addEventListener('click', goToNextPage);
    
    // Tab navigation
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            setActiveTab(button.dataset.tab);
        });
    });
    
    // Modal close
    closeModalButton.addEventListener('click', closeModal);
    
    // Add/remove favorite
    addFavoriteButton.addEventListener('click', toggleFavorite);
    
    // Chart period buttons
    periodButtons.forEach(button => {
        button.addEventListener('click', () => {
            setPeriod(button.dataset.period);
        });
    });
}

// Theme functions
function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggleButton.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        themeToggleButton.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

function toggleTheme() {
    if (document.body.classList.contains('dark-theme')) {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
        themeToggleButton.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
        themeToggleButton.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// API Data Loading Functions
async function loadGlobalMarketData() {
    try {
        const response = await fetch(`${API_BASE_URL}/global`);
        const data = await response.json();
        
        const marketCap = formatCurrency(data.data.total_market_cap[currentCurrency], currentCurrency);
        const volume = formatCurrency(data.data.total_volume[currentCurrency], currentCurrency);
        const btcDominance = data.data.market_cap_percentage.btc.toFixed(1) + '%';
        
        totalMarketCapElement.textContent = marketCap;
        totalVolumeElement.textContent = volume;
        btcDominanceElement.textContent = btcDominance;
    } catch (error) {
        console.error("Error loading global market data:", error);
        totalMarketCapElement.textContent = "ไม่สามารถโหลดข้อมูลได้";
        totalVolumeElement.textContent = "ไม่สามารถโหลดข้อมูลได้";
        btcDominanceElement.textContent = "ไม่สามารถโหลดข้อมูลได้";
    }
}

async function loadCoins() {
    try {
        cryptoDataElement.innerHTML = `
            <tr class="loading-row">
                <td colspan="8">
                    <div class="loading-container">
                        <div class="loading-spinner"></div>
                        <p>กำลังโหลดข้อมูล...</p>
                    </div>
                </td>
            </tr>
        `;
        
        let url;
        if (activeTab === 'trending') {
            url = `${API_BASE_URL}/coins/markets?vs_currency=${currentCurrency}&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h,7d`;
        } else {
            url = `${API_BASE_URL}/coins/markets?vs_currency=${currentCurrency}&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h,7d`;
        }
        
        const response = await fetch(url);
        allCoins = await response.json();
        filteredCoins = [...allCoins];
        
        if (activeTab === 'favorites' && favorites.length > 0) {
            filteredCoins = allCoins.filter(coin => favorites.includes(coin.id));
        }
        
    } catch (error) {
        console.error("Error loading coins:", error);
        cryptoDataElement.innerHTML = `
            <tr>
                <td colspan="8" class="error-message">
                    เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง
                </td>
            </tr>
        `;
    }
}

// Coin List Management
function updateCoinList() {
    if (filteredCoins.length === 0) {
        cryptoDataElement.innerHTML = `
            <tr>
                <td colspan="8" class="no-results">
                    ไม่พบข้อมูลที่ตรงกับการค้นหา
                </td>
            </tr>
        `;
        updatePagination();
        return;
    }
    
    const startIdx = (currentPage - 1) * 20;
    const endIdx = startIdx + 20;
    const displayedCoins = filteredCoins.slice(startIdx, endIdx);
    
    let html = '';
    displayedCoins.forEach((coin, index) => {
        const isPositive24h = coin.price_change_percentage_24h >= 0;
        const isPositive7d = coin.price_change_percentage_7d_in_currency >= 0;
        const isFavorite = favorites.includes(coin.id);
        
        html += `
            <tr data-coin-id="${coin.id}">
                <td>${startIdx + index + 1}</td>
                <td>
                    <div class="coin-info-cell">
                        <img class="coin-logo" src="${coin.image}" alt="${coin.name}">
                        <div>
                            <div class="coin-name">${coin.name}</div>
                            <div class="coin-symbol">${coin.symbol}</div>
                        </div>
                    </div>
                </td>
                <td>${formatCurrency(coin.current_price, currentCurrency)}</td>
                <td>
                    <span class="price-change ${isPositive24h ? 'positive' : 'negative'}">
                        ${isPositive24h ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}%
                    </span>
                </td>
                <td>
                    <span class="price-change ${isPositive7d ? 'positive' : 'negative'}">
                        ${isPositive7d ? '+' : ''}${coin.price_change_percentage_7d_in_currency.toFixed(2)}%
                    </span>
                </td>
                <td>${formatCurrency(coin.market_cap, currentCurrency)}</td>
                <td>${formatCurrency(coin.total_volume, currentCurrency)}</td>
                <td>
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-coin-id="${coin.id}">
                        <i class="${isFavorite ? 'fas' : 'far'} fa-star"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    cryptoDataElement.innerHTML = html;
    
    // Add event listeners for row clicks and favorite buttons
    document.querySelectorAll('tr[data-coin-id]').forEach(row => {
        row.addEventListener('click', (e) => {
            if (!e.target.closest('.favorite-btn')) {
                openCoinModal(row.dataset.coinId);
            }
        });
    });
    
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCoinFavorite(btn.dataset.coinId);
            btn.classList.toggle('active');
            btn.innerHTML = btn.classList.contains('active') ? 
                '<i class="fas fa-star"></i>' : 
                '<i class="far fa-star"></i>';
        });
    });
    
    updatePagination();
}

// Search and Filtering
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        if (activeTab === 'favorites') {
            filteredCoins = allCoins.filter(coin => favorites.includes(coin.id));
        } else {
            filteredCoins = [...allCoins];
        }
    } else {
        let searchResults = allCoins.filter(coin => 
            coin.name.toLowerCase().includes(searchTerm) || 
            coin.symbol.toLowerCase().includes(searchTerm) ||
            coin.id.toLowerCase().includes(searchTerm)
        );
        
        if (activeTab === 'favorites') {
            searchResults = searchResults.filter(coin => favorites.includes(coin.id));
        }
        
        filteredCoins = searchResults;
    }
    
    currentPage = 1;
    updateCoinList();
}

// Tab Navigation
function setActiveTab(tab) {
    activeTab = tab;
    
    tabButtons.forEach(button => {
        if (button.dataset.tab === tab) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    loadCoins().then(() => {
        currentPage = 1;
        updateCoinList();
    });
}

// Pagination Functions
function updatePagination() {
    totalPages = Math.max(1, Math.ceil(filteredCoins.length / 20));
    pageIndicator.textContent = `หน้า ${currentPage} จาก ${totalPages}`;
    
    prevPageButton.disabled = currentPage <= 1;
    nextPageButton.disabled = currentPage >= totalPages;
}

function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        updateCoinList();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function goToNextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        updateCoinList();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Favorites Management
function toggleCoinFavorite(coinId) {
    const index = favorites.indexOf(coinId);
    
    if (index === -1) {
        favorites.push(coinId);
    } else {
        favorites.splice(index, 1);
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    if (activeTab === 'favorites') {
        loadCoins().then(() => updateCoinList());
    }
}

function toggleFavorite() {
    const coinId = addFavoriteButton.dataset.coinId;
    toggleCoinFavorite(coinId);
    
    const isFavorite = favorites.includes(coinId);
    addFavoriteButton.innerHTML = isFavorite ? 
        '<i class="fas fa-star"></i> ลบออกจากรายการโปรด' : 
        '<i class="far fa-star"></i> เพิ่มในรายการโปรด';
}

// Coin Detail Modal
async function openCoinModal(coinId) {
    try {
        // Show loading state
        cryptoModal.style.display = 'block';
        document.querySelector('.modal-content').innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>กำลังโหลดข้อมูล...</p>
            </div>
        `;
        
        // Get coin data and market chart
        const [coinData, marketChart] = await Promise.all([
            fetch(`${API_BASE_URL}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`).then(res => res.json()),
            fetch(`${API_BASE_URL}/coins/${coinId}/market_chart?vs_currency=${currentCurrency}&days=1`).then(res => res.json())
        ]);
        
        // ทำการล็อค console เพื่อดูข้อมูลที่ได้จาก API
        console.log("Market chart data:", marketChart);
        
        // เอา HTML เดิมไว้เหมือนเดิม - แค่เพิ่ม data-coin-id ให้กับปุ่ม add-favorite
        document.querySelector('.modal-content').innerHTML = `
            <div class="modal-header">
                <div class="coin-info">
                    <img id="modal-coin-img" src="${coinData.image.small}" alt="${coinData.name}">
                    <h2 id="modal-coin-name">${coinData.name}</h2>
                    <span id="modal-coin-symbol">${coinData.symbol.toUpperCase()}</span>
                </div>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="price-header">
                <div>
                    <h3 id="modal-coin-price">${formatCurrency(coinData.market_data.current_price[currentCurrency], currentCurrency)}</h3>
                    <span id="modal-price-change" class="change ${coinData.market_data.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}">
                        ${coinData.market_data.price_change_percentage_24h >= 0 ? '+' : ''}${coinData.market_data.price_change_percentage_24h.toFixed(2)}%
                    </span>
                </div>
                <button id="add-favorite" class="favorite-btn" data-coin-id="${coinData.id}">
                    <i class="${favorites.includes(coinData.id) ? 'fas' : 'far'} fa-star"></i> 
                    ${favorites.includes(coinData.id) ? 'ลบออกจากรายการโปรด' : 'เพิ่มในรายการโปรด'}
                </button>
            </div>
            
            <div class="chart-container">
                <div class="chart-controls">
                    <div class="chart-period">
                        <button class="period-btn active" data-period="1">24h</button>
                        <button class="period-btn" data-period="7">7D</button>
                        <button class="period-btn" data-period="30">30D</button>
                        <button class="period-btn" data-period="90">90D</button>
                        <button class="period-btn" data-period="365">1Y</button>
                        <button class="period-btn" data-period="max">MAX</button>
                    </div>
                </div>
                <canvas id="price-chart"></canvas>
            </div>
            
            <div class="coin-stats">
                <div class="stat-group">
                    <div class="stat-item">
                        <span class="stat-label">มูลค่าตลาด</span>
                        <span id="modal-market-cap" class="stat-value">${formatCurrency(coinData.market_data.market_cap[currentCurrency], currentCurrency)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">ปริมาณซื้อขาย 24h</span>
                        <span id="modal-volume" class="stat-value">${formatCurrency(coinData.market_data.total_volume[currentCurrency], currentCurrency)}</span>
                    </div>
                </div>
                <div class="stat-group">
                    <div class="stat-item">
                        <span class="stat-label">Circulating Supply</span>
                        <span id="modal-circulating" class="stat-value">${formatNumber(coinData.market_data.circulating_supply)} ${coinData.symbol.toUpperCase()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Supply</span>
                        <span id="modal-total-supply" class="stat-value">${coinData.market_data.total_supply ? formatNumber(coinData.market_data.total_supply) + ' ' + coinData.symbol.toUpperCase() : 'ไม่มีข้อมูล'}</span>
                    </div>
                </div>
            </div>
            
            <div class="coin-description">
                <h3>เกี่ยวกับ <span id="about-coin-name">${coinData.name}</span></h3>
                <p id="coin-description">${coinData.description.th || coinData.description.en || 'ไม่มีคำอธิบาย'}</p>
            </div>
        `;
        
        // จุดสำคัญที่ต้องแก้ - เรียก DOM elements หลังจากแทนที่ HTML เรียบร้อยแล้ว
        document.querySelector('.close-modal').addEventListener('click', closeModal);
        
        // ใช้ local variable แทนการใช้ global variable
        const modalFavoriteButton = document.getElementById('add-favorite');
        modalFavoriteButton.addEventListener('click', function() {
            const coinId = this.dataset.coinId;
            toggleCoinFavorite(coinId);
            
            const isFavorite = favorites.includes(coinId);
            this.innerHTML = isFavorite ? 
                '<i class="fas fa-star"></i> ลบออกจากรายการโปรด' : 
                '<i class="far fa-star"></i> เพิ่มในรายการโปรด';
        });
        
        // แก้ attach event ให้กับปุ่มเปลี่ยนช่วงเวลา
        document.querySelectorAll('.period-btn').forEach(button => {
            button.addEventListener('click', function() {
                setPeriod(this.dataset.period, coinId);
            });
        });
        
        // เพิ่ม timeout เล็กน้อยก่อนสร้างกราฟ เพื่อให้ DOM พร้อม
        setTimeout(() => {
            const chartCanvas = document.getElementById('price-chart');
            if (chartCanvas && marketChart.prices && marketChart.prices.length > 0) {
                createChart(marketChart.prices);
            } else {
                console.error("Cannot create chart: Canvas or data missing");
            }
        }, 100);
        
    } catch (error) {
        console.error("Error loading coin details:", error);
        document.querySelector('.modal-content').innerHTML = `
            <div class="modal-header">
                <h2>เกิดข้อผิดพลาด</h2>
                <button class="close-modal"><i class="fas fa-times"></i></button>
            </div>
            <div class="error-container">
                <p>ไม่สามารถโหลดข้อมูลเหรียญได้ กรุณาลองใหม่อีกครั้ง</p>
            </div>
        `;
        document.querySelector('.close-modal').addEventListener('click', closeModal);
    }
}

function closeModal() {
    cryptoModal.style.display = 'none';
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}

// Chart Functions
function createChart(priceData) {
    if (!priceData || priceData.length === 0) {
        console.error("No price data available for chart");
        return;
    }

    const chartCanvas = document.getElementById('price-chart');
    if (!chartCanvas) {
        console.error("Chart canvas element not found");
        return;
    }
    
    const ctx = chartCanvas.getContext('2d');
    if (!ctx) {
        console.error("Could not get 2D context from canvas");
        return;
    }
    
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
    
    const timestamps = priceData.map(entry => new Date(entry[0]));
    const prices = priceData.map(entry => entry[1]);
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.2)');
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0)');
    
    const isPositive = prices[0] <= prices[prices.length - 1];
    const lineColor = isPositive ? '#10b981' : '#ef4444';
    const bgColor = isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
    
    try {
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timestamps,
                datasets: [{
                    label: 'Price',
                    data: prices,
                    borderColor: lineColor,
                    backgroundColor: bgColor,
                    borderWidth: 2,
                    tension: 0.1,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return formatCurrency(context.raw, currentCurrency);
                            },
                            title: function(context) {
                                const date = new Date(context[0].label);
                                return date.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxTicksLimit: 8,
                            callback: function(value, index, values) {
                                const date = new Date(timestamps[index]);
                                return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                            }
                        }
                    },
                    y: {
                        position: 'right',
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        });
        console.log("Chart created successfully");
    } catch (error) {
        console.error("Error creating chart:", error);
    }
}

async function setPeriod(days, coinId) {
    if (!coinId) {
        const favoriteBtn = document.getElementById('add-favorite');
        if (favoriteBtn) {
            coinId = favoriteBtn.dataset.coinId;
        }
        
        if (!coinId) {
            console.error("No coin ID available for chart period change");
            return;
        }
    }
    
    // Update active button
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.period-btn[data-period="${days}"]`).classList.add('active');
    
    try {
        console.log(`Loading chart data for ${coinId} over ${days} days`);
        const response = await fetch(`${API_BASE_URL}/coins/${coinId}/market_chart?vs_currency=${currentCurrency}&days=${days}`);
        const data = await response.json();
        
        if (data.prices && data.prices.length > 0) {
            createChart(data.prices);
        } else {
            console.error("No price data received for the selected period");
        }
    } catch (error) {
        console.error("Error loading chart data:", error);
    }
}

// Utility Functions
function formatCurrency(value, currency) {
    if (value === null || value === undefined) return 'N/A';
    
    const currencySymbols = {
        'usd': '$',
        'thb': '฿',
        'eur': '€'
    };
    
    const symbol = currencySymbols[currency] || '';
    
    if (value >= 1_000_000_000) {
        return `${symbol}${(value / 1_000_000_000).toFixed(2)}B`;
    } else if (value >= 1_000_000) {
        return `${symbol}${(value / 1_000_000).toFixed(2)}M`;
    } else if (value >= 1_000) {
        return `${symbol}${(value / 1_000).toFixed(2)}K`;
    } else if (value >= 1) {
        return `${symbol}${value.toFixed(2)}`;
    } else {
        return `${symbol}${value.toPrecision(4)}`;
    }
}

function formatNumber(value) {
    if (value === null || value === undefined) return 'N/A';
    
    if (value >= 1_000_000_000) {
        return `${(value / 1_000_000_000).toFixed(2)}B`;
    } else if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(2)}M`;
    } else if (value >= 1_000) {
        return `${(value / 1_000).toFixed(2)}K`;
    } else {
        return value.toFixed(2);
    }
}