function normalizeExamineeRecord(record = {}) {
  const group = String(record.group ?? record.groupLabel ?? "").trim();
  const time = String(record.time ?? record.session ?? "").trim();
  const track = String(record.track ?? "").trim();
  const admission = String(record.admission ?? record.exam ?? "").trim();
  const series = String(record.series ?? "").trim();
  const unit = String(record.unit ?? record.unitName ?? "").trim();
  const major = String(record.major ?? "").trim();
  const building = String(record.building ?? "").trim();
  const room = String(record.room ?? "").trim();
  const examineeNo = String(record.examineeNo ?? "").trim();

  return {
    ...record,
    group,
    time,
    session: time,
    track,
    admission,
    exam: admission,
    series,
    unit,
    major,
    building,
    room,
    examineeNo,
  };
}

module.exports = {
  normalizeExamineeRecord,
};
