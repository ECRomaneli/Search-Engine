#!/bin/bash

# Build script for Search-Engine
# Creates npm and web versions with their minified counterparts

# Set up colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Check if required tools are installed
check_dependency() {
    local package=$1
    local package_name=${2:-$1}
    
    # Check if package exists in node_modules or globally
    if ! npm list --depth=0 $package &>/dev/null && ! npm list -g --depth=0 $package &>/dev/null; then
        echo -e "${YELLOW}Warning: $package_name is not installed.${NC}"
        read -p "Do you want to install $package_name now? (y/n): " choice
        if [[ "$choice" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}Installing $package_name...${NC}"
            npm install --save-dev $package
            
            # Verify installation
            if ! npm list --depth=0 $package &>/dev/null; then
                echo -e "${RED}Failed to install $package_name. Please install it manually.${NC}"
                exit 1
            fi
        else
            echo -e "${RED}$package_name is required for the build process. Exiting.${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✓ $package_name is installed.${NC}"
    fi
}

echo -e "${BLUE}Checking build dependencies...${NC}"
check_dependency "typescript" "TypeScript"
check_dependency "uglify-js" "UglifyJS"

echo -e "${BLUE}Starting build process for Search-Engine...${NC}"

rm -rf dist

# Create output directories if they don't exist
mkdir -p dist/npm
mkdir -p dist/web

# Step 1: Compile TypeScript to JavaScript
echo -e "${GREEN}Compiling TypeScript...${NC}"
npx tsc

# # Step 2: Create npm version (CommonJS module)
# echo -e "${GREEN}Creating npm version...${NC}"
# cp lib/index.js dist/npm/index.js

# Step 3: Create web version (IIFE format)
echo -e "${GREEN}Creating web version...${NC}"
cat > dist/web/search-engine.js << EOF
/**
 * Search-Engine v$(node -p "require('./package.json').version")
 * A lightweight, powerful object search engine for JavaScript with advanced query syntax
 * 
 * @author Emerson Capuchi Romaneli (ECRomaneli)
 * @license MIT
 */
(function(global) {
    'use strict';
    
    // Self-executing function to create a contained scope
    const SearchEngine = (function() {
        $(cat dist/npm/index.js | grep -v "module.exports" | grep -v "exports." | grep -v "require(")
        
        // Return public API
        return { search };
    })();
    
    // Expose to global environment
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SearchEngine;
    } else if (typeof define === 'function' && define.amd) {
        define(function() { return SearchEngine; });
    } else {
        global.SearchEngine = SearchEngine;
    }
})(typeof window !== 'undefined' ? window : this);
EOF

# Step 4: Minify both versions
echo -e "${GREEN}Minifying files...${NC}"
npx uglifyjs dist/npm/index.js -o dist/npm/index.min.js -c -m --source-map "includeSources=true,url='index.min.js.map'"
npx uglifyjs dist/web/search-engine.js -o dist/web/search-engine.min.js -c -m --source-map "includeSources=true,url='search-engine.min.js.map'"

# Step 5: Copy package.json and README for npm distribution
echo -e "${GREEN}Preparing npm package files...${NC}"

echo -e "${BLUE}Build completed successfully!${NC}"
echo -e "${GREEN}npm version:${NC} dist/npm/index.js ($(du -h dist/npm/index.js | cut -f1)) and dist/npm/index.min.js ($(du -h dist/npm/index.min.js | cut -f1))"
echo -e "${GREEN}web version:${NC} dist/web/search-engine.js ($(du -h dist/web/search-engine.js | cut -f1)) and dist/web/search-engine.min.js ($(du -h dist/web/search-engine.min.js | cut -f1))"