function getDaysDifference(date1, date2) {
    var date1_ms = date1.getTime();
    var date2_ms = date2.getTime();
    var difference_ms = date2_ms - date1_ms;
    var difference_days = Math.floor(difference_ms / (1000 * 60 * 60 * 24));
  
    return difference_days;
}

module.exports = getDaysDifference;
