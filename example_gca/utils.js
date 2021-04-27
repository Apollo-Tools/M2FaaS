module.exports = {
    degreesToRadians: function(degrees) {
        return degrees * Math.PI / 180;
    },
    distanceInMBetweenEarthCoordinates: function(lat1, lon1, lat2, lon2) {
        const earthRadiusKm = 6371;
        const dLat = module.exports.degreesToRadians(lat2 - lat1);
        const dLon = module.exports.degreesToRadians(lon2 - lon1);
        lat1 = module.exports.degreesToRadians(lat1);
        lat2 = module.exports.degreesToRadians(lat2);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c * 1000.0;
    },
    inside: function (point, vs) {
        var x = point[0], y = point[1];
        var inside = false;
        for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            var xi = vs[i][0], yi = vs[i][1];
            var xj = vs[j][0], yj = vs[j][1];
            var intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
}