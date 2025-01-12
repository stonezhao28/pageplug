import React, { ReactNode } from "react";

import { connect } from "react-redux";

import { UIElementSize } from "components/editorComponents/ResizableUtils";
import { ReduxActionTypes } from "@appsmith/constants/ReduxActionConstants";
import { EventType } from "constants/AppsmithActionConstants/ActionConstants";
import BaseWidget, { WidgetProps, WidgetState } from "widgets/BaseWidget";
import WidgetFactory from "utils/WidgetFactory";
import ModalComponent from "../component";
import { RenderMode, WIDGET_PADDING } from "constants/WidgetConstants";
import { generateClassName } from "utils/generators";
import { ClickContentToOpenPropPane } from "utils/hooks/useClickToSelectWidget";
import { AppState } from "@appsmith/reducers";
import { getCanvasWidth, snipingModeSelector } from "selectors/editorSelectors";
import { deselectModalWidgetAction } from "actions/widgetSelectionActions";
import { ValidationTypes } from "constants/WidgetValidation";
import { isAutoHeightEnabledForWidget } from "widgets/WidgetUtils";
import { CanvasWidgetsStructureReduxState } from "reducers/entityReducers/canvasWidgetsStructureReducer";
import { Stylesheet } from "entities/AppTheming";

const minSize = 100;

export class ModalWidget extends BaseWidget<ModalWidgetProps, WidgetState> {
  static getPropertyPaneContentConfig() {
    return [
      {
        sectionName: "属性",
        children: [
          {
            helpText: "允许组件内部内容滚动",
            propertyName: "shouldScrollContents",
            label: "允许内容滚动",
            controlType: "SWITCH",
            isBindProperty: false,
            isTriggerProperty: false,
          },
          {
            propertyName: "animateLoading",
            label: "加载时显示动画",
            controlType: "SWITCH",
            helpText: "组件依赖的数据加载时显示加载动画",
            defaultValue: true,
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            propertyName: "canOutsideClickClose",
            label: "点击背景关闭",
            helpText: "点击背景时关闭弹窗",
            controlType: "SWITCH",
            isBindProperty: false,
            isTriggerProperty: false,
          },
        ],
      },
      {
        sectionName: "事件",
        children: [
          {
            helpText: "弹窗关闭后触发",
            propertyName: "onClose",
            label: "onClose",
            controlType: "ACTION_SELECTOR",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: true,
          },
        ],
      },
    ];
  }

  static getPropertyPaneStyleConfig() {
    return [
      {
        sectionName: "颜色配置",
        children: [
          {
            propertyName: "backgroundColor",
            helpText: "设置组件背景颜色",
            label: "背景颜色",
            controlType: "COLOR_PICKER",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
        ],
      },
      {
        sectionName: "轮廓样式",
        children: [
          {
            propertyName: "borderRadius",
            label: "边框圆角",
            helpText: "边框圆角样式",
            controlType: "BORDER_RADIUS_OPTIONS",

            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
        ],
      },
    ];
  }

  static getStylesheetConfig(): Stylesheet {
    return {
      borderRadius: "{{appsmith.theme.borderRadius.appBorderRadius}}",
      boxShadow: "none",
    };
  }

  static defaultProps = {
    isOpen: true,
    canEscapeKeyClose: false,
  };

  getMaxModalWidth() {
    return this.props.mainCanvasWidth * 0.95;
  }

  getModalWidth(width: number) {
    return Math.min(this.getMaxModalWidth(), width);
  }

  renderChildWidget = (childWidgetData: WidgetProps): ReactNode => {
    const childData = { ...childWidgetData };
    childData.parentId = this.props.widgetId;
    childData.shouldScrollContents = false;
    childData.canExtend = this.props.shouldScrollContents;
    childData.bottomRow = this.props.shouldScrollContents
      ? Math.max(childData.bottomRow, this.props.height)
      : this.props.height;
    childData.containerStyle = "none";
    childData.minHeight = this.props.height;
    childData.rightColumn =
      this.getModalWidth(this.props.width) + WIDGET_PADDING * 2;

    return WidgetFactory.createWidget(childData, this.props.renderMode);
  };

  onModalClose = () => {
    if (this.props.onClose) {
      super.executeAction({
        triggerPropertyName: "onClose",
        dynamicString: this.props.onClose,
        event: {
          type: EventType.ON_MODAL_CLOSE,
        },
      });
    }
    setTimeout(() => {
      this.props.deselectModalWidget(this.props.widgetId, this.props.children);
    }, 0);
  };

  onModalResize = (dimensions: UIElementSize) => {
    const newDimensions = {
      height: Math.max(minSize, dimensions.height),
      width: Math.max(minSize, this.getModalWidth(dimensions.width)),
    };

    if (
      newDimensions.height !== this.props.height &&
      isAutoHeightEnabledForWidget(this.props)
    )
      return;

    const canvasWidgetId =
      this.props.children && this.props.children.length > 0
        ? this.props.children[0]?.widgetId
        : "";
    this.updateWidget("MODAL_RESIZE", this.props.widgetId, {
      ...newDimensions,
      canvasWidgetId,
    });
  };

  closeModal = (e: any) => {
    this.props.showPropertyPane(undefined);
    // TODO(abhinav): Create a static property with is a map of widget properties
    // Populate the map on widget load
    this.props.updateWidgetMetaProperty("isVisible", false);
    e.stopPropagation();
    e.preventDefault();
  };

  getChildren(): ReactNode {
    if (
      this.props.height &&
      this.props.width &&
      this.props.children &&
      this.props.children.length > 0
    ) {
      const children = this.props.children.filter(Boolean);
      return children.length > 0 && children.map(this.renderChildWidget);
    }
  }

  makeModalSelectable(content: ReactNode): ReactNode {
    // substitute coz the widget lacks draggable and position containers.
    return (
      <ClickContentToOpenPropPane widgetId={this.props.widgetId}>
        {content}
      </ClickContentToOpenPropPane>
    );
  }

  makeModalComponent(content: ReactNode, isEditMode: boolean) {
    const artBoard = document.getElementById("art-board");
    const portalContainer = isEditMode && artBoard ? artBoard : undefined;
    const {
      focusedWidget,
      isDragging,
      isSnipingMode,
      selectedWidget,
      selectedWidgets,
      widgetId,
    } = this.props;

    const isWidgetFocused =
      focusedWidget === widgetId ||
      selectedWidget === widgetId ||
      selectedWidgets.includes(widgetId);

    const isResizeEnabled =
      !isDragging && isWidgetFocused && isEditMode && !isSnipingMode;

    return (
      <ModalComponent
        backgroundColor={this.props.backgroundColor}
        borderRadius={this.props.borderRadius}
        canEscapeKeyClose={!!this.props.canEscapeKeyClose}
        canOutsideClickClose={!!this.props.canOutsideClickClose}
        className={`t--modal-widget ${generateClassName(this.props.widgetId)}`}
        enableResize={isResizeEnabled}
        height={this.props.height}
        isDynamicHeightEnabled={isAutoHeightEnabledForWidget(this.props)}
        isEditMode={isEditMode}
        isOpen={!!this.props.isVisible}
        maxWidth={this.getMaxModalWidth()}
        minSize={minSize}
        onClose={this.closeModal}
        onModalClose={this.onModalClose}
        portalContainer={portalContainer}
        resizeModal={this.onModalResize}
        scrollContents={!!this.props.shouldScrollContents}
        widgetId={this.props.widgetId}
        widgetName={this.props.widgetName}
        width={this.getModalWidth(this.props.width)}
      >
        {content}
      </ModalComponent>
    );
  }

  getCanvasView() {
    let children = this.getChildren();
    children = this.makeModalSelectable(children);
    children = this.showWidgetName(children, true);
    if (isAutoHeightEnabledForWidget(this.props, true)) {
      children = this.addAutoHeightOverlay(children, {
        width: "100%",
        height: "100%",
        left: 0,
        top: 0,
      });
    }
    return this.makeModalComponent(children, true);
  }

  getPageView() {
    const children = this.getChildren();
    return this.makeModalComponent(children, false);
  }

  static getWidgetType() {
    return "MODAL_WIDGET";
  }
}

export interface ModalWidgetProps extends WidgetProps {
  renderMode: RenderMode;
  isOpen?: boolean;
  children?: WidgetProps[];
  canOutsideClickClose?: boolean;
  width: number;
  height: number;
  showPropertyPane: (widgetId?: string) => void;
  deselectAllWidgets: () => void;
  canEscapeKeyClose?: boolean;
  shouldScrollContents?: boolean;
  size: string;
  onClose: string;
  mainContainer: WidgetProps;
  backgroundColor: string;
  borderRadius: string;
  mainCanvasWidth: number;
}

const mapDispatchToProps = (dispatch: any) => ({
  // TODO(abhinav): This is also available in dragResizeHooks
  // DRY this. Maybe leverage, CanvasWidget by making it a CanvasComponent?
  showPropertyPane: (
    widgetId?: string,
    callForDragOrResize?: boolean,
    force = false,
  ) => {
    dispatch({
      type:
        widgetId || callForDragOrResize
          ? ReduxActionTypes.SHOW_PROPERTY_PANE
          : ReduxActionTypes.HIDE_PROPERTY_PANE,
      payload: { widgetId, callForDragOrResize, force },
    });
  },
  deselectModalWidget: (
    modalId: string,
    modalWidgetChildren?: CanvasWidgetsStructureReduxState[],
  ) => {
    dispatch(deselectModalWidgetAction(modalId, modalWidgetChildren));
  },
});

const mapStateToProps = (state: AppState) => {
  const props = {
    mainCanvasWidth: getCanvasWidth(state),
    isSnipingMode: snipingModeSelector(state),
    selectedWidget: state.ui.widgetDragResize.lastSelectedWidget,
    selectedWidgets: state.ui.widgetDragResize.selectedWidgets,
    focusedWidget: state.ui.widgetDragResize.focusedWidget,
    isDragging: state.ui.widgetDragResize.isDragging,
    isResizing: state.ui.widgetDragResize.isResizing,
  };
  return props;
};

export default connect(mapStateToProps, mapDispatchToProps)(ModalWidget);
