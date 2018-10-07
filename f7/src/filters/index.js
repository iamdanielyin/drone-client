// set function parseTime,formatTime to filter
import moment from 'moment'

/**
 * 计算时间差
 * @param unix
 * @returns {string}
 */
export function fromNowWithUnix (unix) {
  if (!unix) {
    return ''
  }
  return moment.unix(unix).fromNow()
}
/**
 * 计算耗时
 * @param {unix} startedAt 开始时间
 * @param {unix} finishedAt 结束时间
 */
export function calcTime (startedAt, finishedAt, long) {
  let time = startedAt && finishedAt ? moment.unix(finishedAt).diff(moment.unix(startedAt), 's') : 0
  let mins = parseInt(time / 60)
  let secs = time % 60
  if (long) {
    return mins > 0 ? `${mins} minutes, ${secs} seconds` : `${secs} seconds`
  } else {
    return mins > 0 ? `${mins}m, ${secs}s` : `${secs}s`
  }
}
/**
 * 计算耗时
 * @param {unix} startedAt 开始时间
 * @param {unix} finishedAt 结束时间
 */
export function calcTimeClock (startedAt, finishedAt) {
  let time = startedAt && finishedAt ? moment.unix(finishedAt).diff(moment.unix(startedAt), 's') : 0
  let mins = parseInt(time / 60)
  let secs = time % 60
  mins = mins > 9 ? mins : `0${mins}`
  secs = secs > 9 ? secs : `0${secs}`
  return `${mins}:${secs}`
}
/**
 * 格式化日期类型
 * @param value
 * @param format
 * @returns {string}
 */
function formatDate (value, format) {
  if (!value) {
    return ''
  }
  return moment(value).format(format)
}

/**
 * 格式化时间戳
 * @param value
 * @param format
 * @returns {string}
 */
export function formatUnixDate (value, format) {
  if (!value) {
    return ''
  }
  return moment.unix(value).format(format)
}

/**
 * 格式化日期
 * @param value
 * @returns {string}
 */
export function date (value) {
  return formatDate(value, 'YYYY-MM-DD')
}

/**
 * 格式化成日期时间
 * @param value
 * @returns {string}
 */
export function dateTime (value) {
  return formatDate(value, 'YYYY-MM-DD HH:mm:ss')
}

/**
 * 格式化日期时间短格式
 * @param value
 * @returns {string}
 */
export function dateSortTime (value) {
  return formatDate(value, 'YYYY-MM-DD HH:mm')
}

/**
 * 格式化时间戳： 日期
 * @param value
 * @returns {string}
 */
export function unixDate (value) {
  return formatUnixDate(value, 'YYYY-MM-DD')
}

/**
 * 格式化时间戳：日期时间
 * @param value
 * @returns {string}
 */
export function unixDateTime (value) {
  return formatUnixDate(value, 'YYYY-MM-DD HH:mm:ss')
}

/**
 * 格式化时间戳： 日期 短时间
 * @param value
 * @returns {string}
 */
export function unixDateSortTime (value) {
  return formatUnixDate(value, 'YYYY-MM-DD HH:mm')
}

/**
 * 格式化成json字符串
 * @param value
 * @returns {string}
 */
export function json (value) {
  if (!value) {
    return ''
  }
  return JSON.stringify(value, null, 2)
}

/* 数字 格式化 */
export function numberFormatter (num, digits) {
  const si = [
    { value: 1E18, symbol: 'E' },
    { value: 1E15, symbol: 'P' },
    { value: 1E12, symbol: 'T' },
    { value: 1E9, symbol: 'G' },
    { value: 1E6, symbol: 'M' },
    { value: 1E3, symbol: 'k' }
  ]
  for (let i = 0; i < si.length; i++) {
    if (num >= si[i].value) {
      return (num / si[i].value + 0.1).toFixed(digits).replace(/\.0+$|(\.[0-9]*[1-9])0+$/, '$1') + si[i].symbol
    }
  }
  return num.toString()
}

export function toThousandslsFilter (num) {
  return (+num || 0).toString().replace(/^-?\d+/g, m => m.replace(/(?=(?!\b)(\d{3})+$)/g, ','))
}
