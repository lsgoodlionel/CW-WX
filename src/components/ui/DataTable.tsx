import { View, Text, ScrollView } from '@tarojs/components'

export interface TableColumn {
  title: string
  /** 列宽(750 设计稿 px) */
  width: number
  align?: 'left' | 'center' | 'right'
}

export interface TableRow {
  key: string
  cells: string[]
  /** 合计行等强调样式 */
  summary?: boolean | null
  onClick?: () => void
}

interface DataTableProps {
  columns: TableColumn[]
  rows: TableRow[]
  emptyText?: string
}

/**
 * 横向滚动数据表:报表 / 账簿 / 科目汇总这类多列表格在手机上
 * 不做换行折叠,保持与官方版式一致的行列关系。
 */
export default function DataTable({ columns, rows, emptyText = '暂无数据' }: DataTableProps) {
  const totalWidth = columns.reduce((sum, c) => sum + c.width, 0)

  return (
    <ScrollView scrollX className="ui-table__scroll">
      <View className="ui-table__inner" style={{ width: `${totalWidth}rpx` }}>
        <View className="ui-table__row ui-table__row--head">
          {columns.map((c, i) => (
            <Text
              key={i}
              className={`ui-table__cell ui-table__cell--${c.align || 'left'}`}
              style={{ width: `${c.width}rpx` }}
            >
              {c.title}
            </Text>
          ))}
        </View>
        {rows.map((r) => (
          <View
            key={r.key}
            className={`ui-table__row ${r.summary ? 'ui-table__row--summary' : ''}`}
            onClick={r.onClick}
          >
            {columns.map((c, i) => (
              <Text
                key={i}
                className={`ui-table__cell ui-table__cell--${c.align || 'left'} u-num`}
                style={{ width: `${c.width}rpx` }}
              >
                {r.cells[i] ?? ''}
              </Text>
            ))}
          </View>
        ))}
        {rows.length === 0 ? (
          <View className="ui-empty">
            <Text>{emptyText}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  )
}
