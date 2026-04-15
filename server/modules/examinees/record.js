function normalizeExamineeRecord(record = {}) {
  const group = String(record.group ?? record.groupLabel ?? "").trim();
  const time = String(record.time ?? record.session ?? "").trim();
  const track = String(record.track ?? "").trim();
  const admission = String(record.admission ?? record.exam ?? "").trim();
  const admissionCode = String(record.admissionCode ?? "").trim();
  const series = String(record.series ?? "").trim();
  const seriesCode = String(record.seriesCode ?? "").trim();
  const unit = String(record.unit ?? record.unitName ?? "").trim();
  const unitCode = String(record.unitCode ?? "").trim();
  const major = String(record.major ?? "").trim();
  const majorCode = String(record.majorCode ?? "").trim();
  const building = String(record.building ?? "").trim();
  const buildingCode = String(record.buildingCode ?? "").trim();
  const room = String(record.room ?? "").trim();
  const roomCode = String(record.roomCode ?? "").trim();
  const examineeNo = String(record.examineeNo ?? "").trim();

  return {
    ...record,
    group,
    time,
    session: time,
    track,
    admission,
    exam: admission,
    admissionCode,
    series,
    seriesCode,
    unit,
    unitCode,
    major,
    majorCode,
    building,
    buildingCode,
    room,
    roomCode,
    examineeNo,
  };
}

module.exports = {
  normalizeExamineeRecord,
};
