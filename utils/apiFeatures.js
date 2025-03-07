class APIFeatures {
    constructor (query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }

    filter() {
        // Excluding queries
        const queryObj = { ...this.queryString };
        const EXCLUDED_FIELDS = ['sort', 'page', 'fields', 'limit'];
        EXCLUDED_FIELDS.forEach(query => delete queryObj[query]);

        // Operators
        let queryStr = JSON.stringify(queryObj).replace(/\b(lte|lt|gte|gt)\b/g, match => `$${match}`);

        // Build The Query
        this.query.find( JSON.parse(queryStr) );

        return this;
    }

    sort() {
        // Sorting
        let sortingParams = this.queryString.sort ?? '-createdAt';
        sortingParams = sortingParams.replace(/,/g, ' ');
        this.query.sort(sortingParams);

        return this;
    }

    limitFields() {
        // Filtering Fields
        let fieldsParams = this.queryString.fields ?? '-__v';
        fieldsParams = fieldsParams.replace(/,/g, ' ');
        this.query = this.query.select(fieldsParams);

        return this;
    }

    pagenate() {
        // Pagination
        const page = +this.queryString.page ?? 1;
        const limit = +this.queryString.limit ?? 100;
        const numOfSkipped = (page - 1) * limit;
        
        this.query = this.query.skip(numOfSkipped).limit(limit);

        return this;
    }
}

module.exports = APIFeatures;