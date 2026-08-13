import { View, Text } from '@tarojs/components'
import type { InstanceStep } from '@/types/models'
import { STEP_STATE_LABEL, STEP_STATE_TONE } from '@/constants/labels'
import { dateTime } from '@/utils/format'
import Tag from './Tag'

/** 审批流程链路。 */
export default function Timeline({ steps }: { steps: InstanceStep[] }) {
  return (
    <View className="ui-timeline">
      {steps.map((s) => {
        const tone = STEP_STATE_TONE[s.state] || 'default'
        const faded = s.state === 'upcoming' || s.state === 'skipped'
        return (
          <View
            key={s.step_no}
            className={`ui-timeline__item ${faded ? 'ui-timeline__item--faded' : ''}`}
          >
            <View className={`ui-timeline__dot ui-timeline__dot--${tone}`} />
            <View className="u-row u-wrap u-gap-s">
              <Text className="ui-timeline__title">
                {s.step_no}. {s.name}
              </Text>
              <Tag tone={tone}>{STEP_STATE_LABEL[s.state] || s.state}</Tag>
              {s.is_current ? <Tag tone="blue">当前</Tag> : null}
            </View>
            <View className="ui-timeline__meta">审批人:{s.approver_name || '未指派'}</View>
            {s.comment ? <View className="ui-timeline__meta">意见:{s.comment}</View> : null}
            {s.acted_at ? <View className="ui-timeline__meta">{dateTime(s.acted_at)}</View> : null}
          </View>
        )
      })}
    </View>
  )
}
