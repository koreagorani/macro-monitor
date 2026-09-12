const STATUS_PRIORITY = Object.freeze({
  strong_alert: 0,
  alert: 1,
  watch: 2,
  normal: 3,
  easing: 4,
  unavailable: 5
});

// Input is validated report facts. Never round or mutate facts for ranking.
function selectTelegramIndicators(indicators) {
  return [...indicators].sort((left, right) => {
    const statusOrder = STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status];
    if (statusOrder) return statusOrder;
    const leftContribution = left.riskContribution ?? -Infinity;
    const rightContribution = right.riskContribution ?? -Infinity;
    if (leftContribution !== rightContribution) {
      return leftContribution > rightContribution ? -1 : 1;
    }
    const priorityOrder = left.reportPriority - right.reportPriority;
    if (priorityOrder) return priorityOrder;
    return left.indicatorId < right.indicatorId ? -1 : left.indicatorId > right.indicatorId ? 1 : 0;
  }).slice(0, 3);
}

export { STATUS_PRIORITY, selectTelegramIndicators };
