/**
 * Benchmark utility for search engine performance testing
 * @param {Object} options - Benchmark configuration
 * @param {Object.<string, Function>} options.implementations - Map of search implementations to test
 * @param {Array<Array<Object>>} options.datasets - Test datasets of varying sizes
 * @param {Array<string>} options.queries - Test queries with varied complexity
 * @param {Array<string>} [options.excludeKeys] - Keys to exclude from search
 * @param {number} [options.iterations=100] - Number of iterations per test
 * @param {boolean} [options.warmup=true] - Whether to perform warmup iterations
 * @returns {Object} Benchmark results
 */
function benchmarkSearch(options) {
    const {
        implementations,
        datasets,
        queries,
        excludeKeys,
        iterations = 100,
        warmup = true
    } = options

    const results = {}
    
    // Initialize results structure
    Object.keys(implementations).forEach(name => {
        results[name] = {
            total: 0,
            times: [],
            queryStats: {},
            datasetStats: {}
        }
        
        // Initialize per-query stats
        queries.forEach(query => {
            results[name].queryStats[query] = { 
                total: 0, 
                times: [],
                avg: 0
            }
        })
        
        // Initialize per-dataset stats
        datasets.forEach((_, idx) => {
            results[name].datasetStats[idx] = { 
                total: 0, 
                times: [],
                avg: 0
            }
        })
    })
    
    // Perform warmup if requested
    if (warmup) {
        console.log("Running warmup iterations...")
        for (const name in implementations) {
            const searchFn = implementations[name]
            datasets.forEach(dataset => {
                queries.forEach(query => {
                    searchFn(dataset, query, excludeKeys)
                })
            })
        }
    }
    
    console.log(`Starting benchmark with ${iterations} iterations per test...`)
    
    // Main benchmark loop
    for (let i = 0; i < iterations; i++) {
        for (const name in implementations) {
            const searchFn = implementations[name]
            
            datasets.forEach((dataset, datasetIdx) => {
                queries.forEach(query => {
                    const start = performance.now()
                    searchFn(dataset, query, excludeKeys)
                    const end = performance.now()
                    const time = end - start
                    
                    // Store timing data
                    results[name].times.push(time)
                    results[name].total += time
                    
                    // Store per-query timing
                    results[name].queryStats[query].times.push(time)
                    results[name].queryStats[query].total += time
                    
                    // Store per-dataset timing
                    results[name].datasetStats[datasetIdx].times.push(time)
                    results[name].datasetStats[datasetIdx].total += time
                })
            })
        }
        
        // Show progress indicator
        if ((i + 1) % Math.max(1, Math.floor(iterations / 10)) === 0) {
            console.log(`Progress: ${Math.round(((i + 1) / iterations) * 100)}%`)
        }
    }
    
    // Calculate statistics
    for (const name in implementations) {
        const stats = results[name]
        
        // Global statistics
        const totalIterations = stats.times.length
        stats.avg = stats.total / totalIterations
        stats.median = calculateMedian(stats.times)
        stats.stdDev = calculateStdDev(stats.times, stats.avg)
        stats.min = Math.min(...stats.times)
        stats.max = Math.max(...stats.times)
        
        // Per-query statistics
        for (const query in stats.queryStats) {
            const queryStats = stats.queryStats[query]
            const queryIterations = queryStats.times.length
            queryStats.avg = queryStats.total / queryIterations
            queryStats.median = calculateMedian(queryStats.times)
            queryStats.stdDev = calculateStdDev(queryStats.times, queryStats.avg)
            queryStats.min = Math.min(...queryStats.times)
            queryStats.max = Math.max(...queryStats.times)
        }
        
        // Per-dataset statistics
        for (const datasetIdx in stats.datasetStats) {
            const datasetStats = stats.datasetStats[datasetIdx]
            const datasetIterations = datasetStats.times.length
            datasetStats.avg = datasetStats.total / datasetIterations
            datasetStats.median = calculateMedian(datasetStats.times)
            datasetStats.stdDev = calculateStdDev(datasetStats.times, datasetStats.avg)
            datasetStats.min = Math.min(...datasetStats.times)
            datasetStats.max = Math.max(...datasetStats.times)
        }
    }
    
    // Print formatted results
    printResults(results)
    
    return results
}

/**
 * Calculate median of an array of numbers
 * @param {Array<number>} arr - Array of numbers
 * @returns {number} Median value
 */
function calculateMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid]
}

/**
 * Calculate standard deviation
 * @param {Array<number>} arr - Array of numbers
 * @param {number} mean - Mean value
 * @returns {number} Standard deviation
 */
function calculateStdDev(arr, mean) {
    const squaredDiffs = arr.map(x => Math.pow(x - mean, 2))
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / arr.length
    return Math.sqrt(variance)
}

/**
 * Print formatted benchmark results
 * @param {Object} results - Benchmark results
 */
function printResults(results) {
    console.log("\n============== BENCHMARK RESULTS ==============\n")
    
    // Overall summary table
    console.log("SUMMARY:")
    console.table(Object.keys(results).map(name => ({
        Implementation: name,
        "Avg Time (ms)": results[name].avg.toFixed(3),
        "Median (ms)": results[name].median.toFixed(3),
        "StdDev": results[name].stdDev.toFixed(3),
        "Min (ms)": results[name].min.toFixed(3),
        "Max (ms)": results[name].max.toFixed(3)
    })))
    
    // Detailed results per implementation
    for (const name in results) {
        console.log(`\n--- DETAILS: ${name} ---`)
        
        // Per-query stats
        console.log("\nBy Query:")
        const queryStats = Object.keys(results[name].queryStats).map(query => ({
            Query: query.length > 30 ? query.substring(0, 27) + "..." : query,
            "Avg Time (ms)": results[name].queryStats[query].avg.toFixed(3),
            "Median (ms)": results[name].queryStats[query].median.toFixed(3),
            "StdDev": results[name].queryStats[query].stdDev.toFixed(3)
        }))
        console.table(queryStats)
        
        // Per-dataset stats
        console.log("\nBy Dataset:")
        const datasetStats = Object.keys(results[name].datasetStats).map(idx => ({
            "Dataset Size": parseInt(idx) + 1,
            "Avg Time (ms)": results[name].datasetStats[idx].avg.toFixed(3),
            "Median (ms)": results[name].datasetStats[idx].median.toFixed(3),
            "StdDev": results[name].datasetStats[idx].stdDev.toFixed(3)
        }))
        console.table(datasetStats)
    }
}

/**
 * Run benchmark with sample data and queries
 */
function runSearchBenchmark() {
    // Create sample datasets
    const smallDataset = Array(100).fill().map((_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `This is item number ${i} with some searchable content`,
        price: Math.random() * 1000,
        tags: ['tag1', 'tag2', i % 3 === 0 ? 'special' : 'normal'],
        details: {
            color: i % 3 === 0 ? 'red' : i % 3 === 1 ? 'blue' : 'green',
            weight: Math.random() * 10,
            dimensions: { width: 10, height: 20, depth: 5 }
        }
    }))
    
    const largeDataset = Array(1000).fill().map((_, i) => ({
        id: i,
        name: `Product ${i}`,
        description: `Detailed description for product ${i} with additional keywords`,
        price: Math.random() * 1000,
        tags: ['tag1', 'tag2', i % 5 === 0 ? 'premium' : 'standard'],
        details: {
            color: ['red', 'blue', 'green', 'yellow', 'black'][i % 5],
            weight: Math.random() * 10,
            dimensions: { width: Math.random() * 100, height: Math.random() * 100, depth: Math.random() * 50 }
        },
        reviews: Array(3).fill().map((_, j) => ({
            rating: Math.floor(Math.random() * 5) + 1,
            text: `Review ${j} for product ${i}. This is some review text.`
        }))
    }))
    
    // Sample queries with varying complexity
    const queries = [
        "red",
        "name:item",
        "price~:100-500",
        "details.color:red and price~:0-100",
        "tag1 or tag2",
        "(tag1 and red) or (price~:500-1000)",
        "not details.color:green",
        "description:\"searchable content\"",
        "tags*:.tag+ and details.weight~:0-5",
    ]
    
    // Implementations to benchmark
    const implementations = {
        "Original": search,  // The original search implementation
        
        // Add alternative implementations to compare:
        // "Alternative": alternativeSearch,
        // "NoRegex": searchWithoutRegex,
    }
    
    return benchmarkSearch({
        implementations,
        datasets: [smallDataset, largeDataset],
        queries,
        iterations: 300,
        warmup: true
    })
}

const { search } = require('./index')
runSearchBenchmark()