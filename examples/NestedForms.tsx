import * as React from 'react'
import * as yup from 'yup'
import {Block} from 'baseui/block'
import {HeadingMedium} from 'baseui/typography'
import {Input as BaseInput} from 'baseui/input'

import {useForm} from '../src/useForm'

export function NestedForms() {
  const validator = React.useMemo(() => createValidator('firstLevel'), [])
  const {fieldProps, values} = useForm({validator, name: 'TOP'})
  // console.log(fieldProps.firstLevel0.error)
  return (
    <div>
      <HeadingMedium>Nested forms</HeadingMedium>
      <Block display="flex">
        <div>
          <div>
            <Input {...fieldProps.topField0} />
          </div>
          <div>
            <Input {...fieldProps.topField1} />
          </div>
          <div>
            <Input {...fieldProps.topField2} />
          </div>
          <span>{JSON.stringify(fieldProps.firstLevel0.error)}</span>
          <FirstLevel {...fieldProps.firstLevel0} />
          <FirstLevel {...fieldProps.firstLevel1} />
          <FirstLevel {...fieldProps.firstLevel2} />
        </div>
        <div>
          {JSON.stringify(values)}
        </div>
      </Block>
    </div>
  )
}

function InnerFirstLevel(props) {
  const {onChange, onError} = props
  const validator = React.useMemo(() => createValidator('firstField'), [])
  const {fieldProps} = useForm({onChange, onError, validator, name: 'FIRST'})
  return (
    <div style={{marginLeft: '50px'}}>
      <div>
        <Input {...fieldProps.firstField0} />
        <span>{fieldProps.firstField0.error}</span>
      </div>
      <div>
        <Input {...fieldProps.firstField1} />
        <span>{fieldProps.firstField1.error}</span>
      </div>
      <div>
        <Input {...fieldProps.firstField2} />
        <span>{fieldProps.firstField2.error}</span>
      </div>
      <SecondLevel {...fieldProps.secondLevel0} />
      <SecondLevel {...fieldProps.secondLevel1} />
      <SecondLevel {...fieldProps.secondLevel2} />
    </div>
  )
}

const FirstLevel = React.memo(InnerFirstLevel)

function InnerSecondLevel(props) {
  const {onChange} = props
  const validator = React.useMemo(() => createValidator('secondField'), [])
  const {fieldProps} = useForm({onChange, validator})
  return (
    <div style={{marginLeft: '50px'}}>
      <div>
        <Input {...fieldProps.secondField0} />
      </div>
      <div>
        <Input {...fieldProps.secondField1} />
      </div>
      <div>
        <Input {...fieldProps.secondField2} />
      </div>
    </div>
  )
}

const SecondLevel = React.memo(InnerSecondLevel)

function InnerInput(props) {
  return (
    <Block width="250px">
      <BaseInput {...props} />
    </Block>
  )
}

const Input = React.memo(InnerInput)

function createValidator(fieldPrefix, labelPrefix = '') {
  const shape = {}
  for (let ii = 0; ii < 3; ++ii) {
    shape[`${fieldPrefix}${ii}`] = yup.string().required().label(`${labelPrefix || fieldPrefix}${ii}`)
  }
  return yup.object().shape(shape)
}
