import React from "react";
import { isEmail } from "utils/formhelpers";
import { apiRequestConfig } from "api/Api";
import UserApi from "@appsmith/api/UserApi";
import {
  AdminConfigType,
  SettingCategories,
  SettingSubtype,
  SettingTypes,
  Setting,
} from "@appsmith/pages/AdminSettings/config/types";
import BrandingBadge from "pages/AppViewer/BrandingBadge";
import { TagInput } from "design-system";
import QuestionFillIcon from "remixicon-react/QuestionFillIcon";
import localStorage from "utils/localStorage";
import isUndefined from "lodash/isUndefined";

export const APPSMITH_INSTANCE_NAME_SETTING_SETTING: Setting = {
  id: "APPSMITH_INSTANCE_NAME",
  category: SettingCategories.GENERAL,
  controlType: SettingTypes.TEXTINPUT,
  controlSubType: SettingSubtype.TEXT,
  label: "实例名称",
  placeholder: "pageplug",
};

export const APPSMITH__ADMIN_EMAILS_SETTING: Setting = {
  id: "APPSMITH_ADMIN_EMAILS",
  category: SettingCategories.GENERAL,
  controlType: SettingTypes.TEXTINPUT,
  controlSubType: SettingSubtype.EMAIL,
  label: "管理员邮箱",
  subText: "多个管理员用逗号分隔，管理员可以修改实例设置",
  placeholder: "admin@example.com",
  validate: (value: string) => {
    if (
      value &&
      !value
        .split(",")
        .reduce((prev, curr) => prev && isEmail(curr.trim()), true)
    ) {
      return "请输入有效邮箱地址";
    }
  },
};

export const APPSMITH_DOWNLOAD_DOCKER_COMPOSE_FILE_SETTING: Setting = {
  id: "APPSMITH_DOWNLOAD_DOCKER_COMPOSE_FILE",
  action: () => {
    const { host, protocol } = window.location;
    window.open(
      `${protocol}//${host}${apiRequestConfig.baseURL}${UserApi.downloadConfigURL}`,
      "_blank",
    );
  },
  category: SettingCategories.GENERAL,
  controlType: SettingTypes.BUTTON,
  label: "生成 Docker Compose 文件",
  text: "下载",
};

export const APPSMITH_DISABLE_TELEMETRY_SETTING: Setting = {
  id: "APPSMITH_DISABLE_TELEMETRY",
  category: SettingCategories.GENERAL,
  controlType: SettingTypes.TOGGLE,
  label: "匿名共享使用数据",
  subText: "共享匿名数据帮助我们提高用户体验",
  toggleText: (value: boolean) =>
    value ? "不分享任何数据" : "共享匿名遥感数据",
};

export const APPSMITH_HIDE_WATERMARK_SETTING: Setting = {
  id: "APPSMITH_HIDE_WATERMARK",
  name: "APPSMITH_HIDE_WATERMARK",
  category: SettingCategories.GENERAL,
  controlType: SettingTypes.CHECKBOX,
  label: "Appsmith Watermark",
  text: "Show Appsmith Watermark",
  needsUpgrade: true,
  isDisabled: () => true,
  textSuffix: <BrandingBadge />,
  upgradeLogEventName: "ADMIN_SETTINGS_UPGRADE_WATERMARK",
  upgradeIntercomMessage:
    "Hello, I would like to upgrade and remove the watermark.",
};

export const APPSMITH_ALLOWED_FRAME_ANCESTORS_SETTING: Setting = {
  id: "APPSMITH_ALLOWED_FRAME_ANCESTORS",
  name: "APPSMITH_ALLOWED_FRAME_ANCESTORS",
  category: SettingCategories.GENERAL,
  controlType: SettingTypes.RADIO,
  label: "嵌入配置",
  controlTypeProps: {
    options: [
      {
        badge: "不推荐",
        tooltip: {
          icon: <QuestionFillIcon />,
          text: "允许所有网站（包括那些恶意网站）随意嵌入你的 PagePlug 应用",
          linkText: "为什么这是非常危险的？",
          link:
            "https://docs.appsmith.com/getting-started/setup/instance-configuration/frame-ancestors#why-should-i-control-this",
        },
        label: "允许嵌入到任何地方",
        value: "ALLOW_EMBEDDING_EVERYWHERE",
      },
      {
        label: "限制嵌入到指定的 URL",
        value: "LIMIT_EMBEDDING",
        nodeLabel: "可以添加多个 URL",
        node: <TagInput input={{}} placeholder={""} type={"text"} />,
        nodeInputPath: "input",
        nodeParentClass: "tag-input",
      },
      {
        label: "不允许嵌入到任何地方",
        value: "DISABLE_EMBEDDING_EVERYWHERE",
      },
    ],
  },
  format: (value: string) => {
    if (value === "*") {
      return {
        value: "ALLOW_EMBEDDING_EVERYWHERE",
      };
    } else if (value === "'none'") {
      return {
        value: "DISABLE_EMBEDDING_EVERYWHERE",
      };
    } else {
      return {
        value: "LIMIT_EMBEDDING",
        additionalData: value ? value.replaceAll(" ", ",") : "",
      };
    }
  },
  parse: (value: { value: string; additionalData?: any }) => {
    // Retrieve values from local storage while switching to limit by url option
    const sources = isUndefined(value.additionalData)
      ? localStorage.getItem("ALLOWED_FRAME_ANCESTORS") ?? ""
      : value.additionalData.replaceAll(",", " ");
    // If they are one of the other options we don't store it in storage since it will
    // set in the env variable on save
    if (sources !== "*" && sources !== "'none'") {
      localStorage.setItem("ALLOWED_FRAME_ANCESTORS", sources);
    }

    if (value.value === "ALLOW_EMBEDDING_EVERYWHERE") {
      return "*";
    } else if (value.value === "DISABLE_EMBEDDING_EVERYWHERE") {
      return "'none'";
    } else {
      return sources;
    }
  },
  validate: (value: string) => {
    if (!value) {
      return "这个字段不能为空";
    }
  },
};

export const config: AdminConfigType = {
  icon: "settings-2-line",
  type: SettingCategories.GENERAL,
  controlType: SettingTypes.GROUP,
  title: "通用",
  canSave: true,
  settings: [
    APPSMITH_INSTANCE_NAME_SETTING_SETTING,
    APPSMITH__ADMIN_EMAILS_SETTING,
    APPSMITH_DOWNLOAD_DOCKER_COMPOSE_FILE_SETTING,
    APPSMITH_DISABLE_TELEMETRY_SETTING,
    // APPSMITH_HIDE_WATERMARK_SETTING,
    APPSMITH_ALLOWED_FRAME_ANCESTORS_SETTING,
  ],
} as AdminConfigType;
