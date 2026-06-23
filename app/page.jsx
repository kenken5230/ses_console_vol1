"use client";

import { useEffect, useMemo, useState } from "react";
import FilterModal from "../components/FilterModal";
import Header from "../components/Header";
import KeywordModal from "../components/KeywordModal";
import LoginPanel from "../components/LoginPanel";
import Pagination from "../components/Pagination";
import PersonCreateDrawer from "../components/PersonCreateDrawer";
import PersonDetailPane from "../components/PersonDetailPane";
import PersonTable from "../components/PersonTable";
import ProjectCreateDrawer from "../components/ProjectCreateDrawer";
import ProjectDetailPane from "../components/ProjectDetailPane";
import ProjectTable from "../components/ProjectTable";
import SearchHistoryModal from "../components/SearchHistoryModal";
import SearchToolbar from "../components/SearchToolbar";
import UnclassifiedMailDetailPane from "../components/UnclassifiedMailDetailPane";
import UnclassifiedMailTable from "../components/UnclassifiedMailTable";
import { filterFormRows, focusOptions, personFilterFormRows, quickFilters } from "../data/mockProjects";
import { textMatchesSearchQuery } from "../lib/search-token-match";

const defaultQuickFilters = Object.fromEntries(quickFilters.map((filter) => [filter.id, Boolean(filter.defaultChecked)]));
const currentMocUserName = "営業担当A";

async function fetchDashboardData() {
  const response = await fetch("/api/dashboard-data", { cache: "no-store" });
  if (!response.ok) throw new Error("DBデータの取得に失敗しました");

  return response.json();
}

async function fetchProjectDetail(projectId) {
  const response = await fetch(`/api/dashboard-data?detail=project&id=${encodeURIComponent(projectId)}`, { cache: "no-store" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.message || "Failed to load project detail");
  return result.project;
}

async function fetchPersonDetail(personId) {
  const response = await fetch(`/api/dashboard-data?detail=person&id=${encodeURIComponent(personId)}`, { cache: "no-store" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.message || "Failed to load person detail");
  return result.person;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getOneMonthAgoDate() {
  const date = new Date();
  const currentDay = date.getDate();

  date.setMonth(date.getMonth() - 1);
  if (date.getDate() !== currentDay) date.setDate(0);

  return formatDate(date);
}

function createEmptyFilterValues() {
  return {
    createdFrom: "",
    createdTo: "",
    projectId: "",
    exclude: "",
    startMonthFrom: "",
    startMonthTo: "",
    skill: "",
    unitMin: "",
    unitMax: "",
    unitUndecidedOnly: false,
    prefecture: "",
    remote: [],
    statuses: [],
    workDays: []
  };
}

function createDefaultFilterValues() {
  return {
    ...createEmptyFilterValues(),
    createdFrom: getOneMonthAgoDate()
  };
}

function getProjectDate(project, label) {
  const fields = project.detail?.fields || [];
  const fieldValue = fields.find((field) => field.label === label)?.value;
  const candidates = [project.createdAt, fieldValue].filter(Boolean);

  for (const candidate of candidates) {
    const match = String(candidate).match(/\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }

  return "";
}

function collectProjectText(project) {
  if (project.searchText) return project.searchText;

  const detailFields = project.detail?.fields || [];
  const detailText = detailFields
    .flatMap((field) => [field.value, field.lines, field.tags, field.items])
    .flat(3)
    .filter(Boolean)
    .join(" ");

  return [
    project.id,
    project.title,
    project.company,
    project.unitPrice,
    project.locations?.join(" "),
    project.tags?.join(" "),
    project.status,
    detailText
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function collectPersonText(person) {
  if (person.searchText) return person.searchText;

  const detailFields = person.detail?.fields || [];
  const detailText = detailFields
    .flatMap((field) => [field.value, field.lines, field.tags, field.items])
    .flat(3)
    .filter(Boolean)
    .join(" ");

  return [
    person.id,
    person.name,
    person.company,
    person.status,
    person.unitPrice,
    person.availableFrom,
    person.preferredLocation,
    person.remotePreference,
    person.nationality,
    person.skills,
    person.createdAt,
    person.createdByName,
    detailText
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function collectMailText(mail) {
  const detailFields = mail.detail?.fields || [];
  const detailText = detailFields
    .flatMap((field) => [field.value, field.lines, field.tags, field.items])
    .flat(3)
    .filter(Boolean)
    .join(" ");

  return [
    mail.id,
    mail.subject,
    mail.senderCompany,
    mail.sender,
    mail.fromName,
    mail.fromEmail,
    mail.receivedAt,
    mail.classification,
    mail.excludedLabel,
    mail.bodyText,
    detailText
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildActiveConditions(filters, isProjectTab) {
  const conditions = [];

  if (filters.createdFrom || filters.createdTo) {
    conditions.push({
      id: "createdAt",
      label: isProjectTab ? "案件作成日" : "要員作成日",
      value: `${filters.createdFrom || "下限"} ~${filters.createdTo ? ` ${filters.createdTo}` : ""}`
    });
  }
  if (filters.projectId.trim()) conditions.push({ id: "projectId", label: isProjectTab ? "案件ID" : "要員ID", value: filters.projectId.trim() });
  if (filters.exclude.trim()) conditions.push({ id: "exclude", label: "除外キーワード", value: filters.exclude.trim() });
  if (filters.startMonthFrom || filters.startMonthTo) {
    conditions.push({
      id: "startMonth",
      label: isProjectTab ? "案件開始月" : "稼働開始日",
      value: `${filters.startMonthFrom || "下限"} ~${filters.startMonthTo ? ` ${filters.startMonthTo}` : ""}`
    });
  }
  if (filters.skill.trim()) conditions.push({ id: "skill", label: "スキル", value: filters.skill.trim() });
  if (filters.unitMin || filters.unitMax || filters.unitUndecidedOnly) {
    conditions.push({
      id: "unit",
      label: isProjectTab ? "単価" : "希望単価",
      value: filters.unitUndecidedOnly ? "未定のみ" : `${filters.unitMin || "下限"} ~ ${filters.unitMax || "上限"}万円`
    });
  }
  if (filters.prefecture.trim()) conditions.push({ id: "prefecture", label: isProjectTab ? "都道府県" : "希望勤務地", value: filters.prefecture.trim() });
  if (filters.remote.length) conditions.push({ id: "remote", label: isProjectTab ? "こだわり条件" : "リモート条件", value: filters.remote.join("、") });
  if (filters.statuses.length) conditions.push({ id: "statuses", label: "状態", value: filters.statuses.join("、") });
  if (isProjectTab && filters.workDays.length) conditions.push({ id: "workDays", label: "想定稼働日数", value: filters.workDays.join("、") });

  return conditions;
}

function isForeignNationality(nationality) {
  const value = String(nationality || "").trim();
  if (!value || value === "未入力" || value === "-") return false;
  return !/(日本|日本国籍|日本人|Japanese|Japan|JPN)/i.test(value);
}

function matchesProjectFocus(project, focusId) {
  const projectText = collectProjectText(project);

  if (focusId === "direct") {
    return project.attention?.includes("エンド直/元請直") || projectText.includes("エンド直") || projectText.includes("元請直");
  }
  if (focusId === "highUnitPrice") {
    return Number(project.unitPriceValue || 0) >= 90;
  }
  if (focusId === "remoteHybrid") {
    return projectText.includes("フルリモート") || projectText.includes("リモート併用");
  }

  return false;
}

export default function Home() {
  const [projects, setProjects] = useState([]);
  const [persons, setPersons] = useState([]);
  const [unclassifiedMails, setUnclassifiedMails] = useState([]);
  const [isLoadingDbData, setIsLoadingDbData] = useState(true);
  const [authStatus, setAuthStatus] = useState("checking");
  const [currentUser, setCurrentUser] = useState(null);
  const [personOwnerLinkWriteAllowed, setPersonOwnerLinkWriteAllowed] = useState(false);
  const [projectCompanyContactRoleLinkWriteAllowed, setProjectCompanyContactRoleLinkWriteAllowed] = useState(false);
  const [activeTab, setActiveTab] = useState("案件");
  const [search, setSearch] = useState("");
  const [checkedFilters, setCheckedFilters] = useState(defaultQuickFilters);
  const [selectedFocus, setSelectedFocus] = useState([]);
  const [selectedSort, setSelectedSort] = useState("おすすめ順");
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedMail, setSelectedMail] = useState(null);
  const [isMovingMail, setIsMovingMail] = useState(false);
  const [menuProjectId, setMenuProjectId] = useState(null);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [focusMenuOpen, setFocusMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [pageSizeMenuOpen, setPageSizeMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [notice, setNotice] = useState("");
  const [isSyncingGmail, setIsSyncingGmail] = useState(false);
  const [hasPendingDataRefresh, setHasPendingDataRefresh] = useState(false);
  const [keywordDraft, setKeywordDraft] = useState({ include: "", exclude: "" });
  const [filterValues, setFilterValues] = useState(createDefaultFilterValues);

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      setIsLoadingDbData(true);
      try {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        const session = await sessionResponse.json().catch(() => ({}));
        if (!session?.authenticated || !session?.user) {
          if (ignore) return;
          setCurrentUser(null);
          setPersonOwnerLinkWriteAllowed(false);
          setProjectCompanyContactRoleLinkWriteAllowed(false);
          setAuthStatus("unauthenticated");
          setProjects([]);
          setPersons([]);
          setUnclassifiedMails([]);
          return;
        }

        if (ignore) return;
        setCurrentUser(session.user);
        setAuthStatus("authenticated");

        const nextData = await fetchDashboardData();
        if (ignore) return;
        if (nextData.currentUser) setCurrentUser(nextData.currentUser);
        setPersonOwnerLinkWriteAllowed(nextData.personOwnerLinkWriteAllowed === true);
        setProjectCompanyContactRoleLinkWriteAllowed(nextData.projectCompanyContactRoleLinkWriteAllowed === true);
        setProjects(nextData.projects || []);
        setPersons(nextData.persons || []);
        setUnclassifiedMails(nextData.unclassifiedMails || []);
      } catch (error) {
        if (!ignore) {
          setPersonOwnerLinkWriteAllowed(false);
          setProjectCompanyContactRoleLinkWriteAllowed(false);
          setAuthStatus("unauthenticated");
          setNotice(error instanceof Error ? error.message : "DBデータの取得に失敗しました");
        }
      } finally {
        if (!ignore) setIsLoadingDbData(false);
      }
    }

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!notice) return undefined;

    const timerId = window.setTimeout(() => {
      setNotice("");
    }, 3000);

    return () => window.clearTimeout(timerId);
  }, [notice]);

  const handleRefresh = async () => {
    closeMenus();
    setIsLoadingDbData(true);
    try {
      const nextData = await fetchDashboardData();
      if (nextData.currentUser) setCurrentUser(nextData.currentUser);
      setPersonOwnerLinkWriteAllowed(nextData.personOwnerLinkWriteAllowed === true);
      setProjectCompanyContactRoleLinkWriteAllowed(nextData.projectCompanyContactRoleLinkWriteAllowed === true);
      setProjects(nextData.projects || []);
      setPersons(nextData.persons || []);
      setUnclassifiedMails(nextData.unclassifiedMails || []);
      setHasPendingDataRefresh(false);
      setNotice("DBから最新データを再取得しました");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "DBデータの再取得に失敗しました");
    } finally {
      setIsLoadingDbData(false);
    }
  };

  const reloadDashboardData = async () => {
    const nextData = await fetchDashboardData();
    if (nextData.currentUser) setCurrentUser(nextData.currentUser);
    setPersonOwnerLinkWriteAllowed(nextData.personOwnerLinkWriteAllowed === true);
    setProjectCompanyContactRoleLinkWriteAllowed(nextData.projectCompanyContactRoleLinkWriteAllowed === true);
    setProjects(nextData.projects || []);
    setPersons(nextData.persons || []);
    setUnclassifiedMails(nextData.unclassifiedMails || []);
    return nextData;
  };

  const loadSelectedProjectDetail = async (project) => {
    if (!project?.dbId || (project.detailLoaded && project.formValuesLoaded)) return project;
    const detailProject = await fetchProjectDetail(project.dbId);
    const mergedProject = { ...project, ...detailProject, detailLoaded: true, formValuesLoaded: true };
    setSelectedProject((current) => (current?.dbId === project.dbId ? { ...current, ...mergedProject } : current));
    setProjects((current) => current.map((item) => (item.dbId === project.dbId ? { ...item, ...mergedProject } : item)));
    return mergedProject;
  };

  const loadSelectedPersonDetail = async (person) => {
    if (!person?.dbId || person.detailLoaded) return person;
    const detailPerson = await fetchPersonDetail(person.dbId);
    const mergedPerson = { ...person, ...detailPerson, detailLoaded: true, formValuesLoaded: true };
    setSelectedPerson((current) => (current?.dbId === person.dbId ? { ...current, ...mergedPerson } : current));
    setPersons((current) => current.map((item) => (item.dbId === person.dbId ? { ...item, ...mergedPerson } : item)));
    return mergedPerson;
  };

  const handleSelectProject = async (project) => {
    setSelectedProject(project);
    setMenuProjectId(null);
    try {
      await loadSelectedProjectDetail(project);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to load project detail");
    }
  };

  const handleSelectPerson = async (person) => {
    setSelectedPerson(person);
    try {
      await loadSelectedPersonDetail(person);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to load person detail");
    }
  };

  const handlePersonOwnerLinkLinked = async (personDbId) => {
    const nextData = await reloadDashboardData();
    const nextSelectedPerson = nextData.persons?.find((person) => person.dbId === personDbId) || null;
    setSelectedPerson(nextSelectedPerson);
    if (nextSelectedPerson) await loadSelectedPersonDetail(nextSelectedPerson);
    setNotice("既存会社・既存担当者へのリンクを保存し、最新データを再取得しました");
    return nextSelectedPerson;
  };

  const handleProjectCompanyContactRoleLinked = async (projectDbId) => {
    const nextData = await reloadDashboardData();
    const nextSelectedProject = nextData.projects?.find((project) => project.dbId === projectDbId || project.id === projectDbId) || null;
    setSelectedProject(nextSelectedProject);
    if (nextSelectedProject) await loadSelectedProjectDetail(nextSelectedProject);
    setNotice("案件の既存会社・既存担当者リンクを保存し、最新データを再取得しました");
    return nextSelectedProject;
  };

  const handleAuthenticated = async (user) => {
    setCurrentUser(user);
    setAuthStatus("authenticated");
    setIsLoadingDbData(true);
    try {
      await reloadDashboardData();
      setNotice("ログインしました");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "DBデータの取得に失敗しました");
    } finally {
      setIsLoadingDbData(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setCurrentUser(null);
    setPersonOwnerLinkWriteAllowed(false);
    setProjectCompanyContactRoleLinkWriteAllowed(false);
    setAuthStatus("unauthenticated");
    setProjects([]);
    setPersons([]);
    setUnclassifiedMails([]);
    setSelectedProject(null);
    setSelectedPerson(null);
    setSelectedMail(null);
    setHasPendingDataRefresh(false);
    setNotice("");
  };

  const handleProjectSaved = async (message = "案件を保存しました", projectId = null, keepSelected = false) => {
    setActiveModal(null);
    setActiveTab("案件");
    setIsLoadingDbData(true);
    try {
      const nextData = await reloadDashboardData();
      const nextSelectedProject = keepSelected && projectId ? nextData.projects?.find((project) => project.dbId === projectId || project.id === projectId) : null;
      setSelectedProject(nextSelectedProject || null);
      if (nextSelectedProject) await loadSelectedProjectDetail(nextSelectedProject);
      setNotice(message);
      setCurrentPage(1);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "案件保存後の一覧更新に失敗しました");
    } finally {
      setIsLoadingDbData(false);
    }
  };

  const handleProjectCreated = (result) => {
    handleProjectSaved("案件を作成しました", result?.projectId, false);
  };

  const handleProjectUpdated = (result) => {
    handleProjectSaved("案件を更新しました", result?.projectId || selectedProject?.dbId, true);
  };

  const handlePersonCreated = async () => {
    setActiveModal(null);
    setActiveTab("要員");
    setSelectedPerson(null);
    setIsLoadingDbData(true);
    try {
      await reloadDashboardData();
      setNotice("要員を作成しました");
      setCurrentPage(1);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "要員作成後の一覧更新に失敗しました");
    } finally {
      setIsLoadingDbData(false);
    }
  };

  const currentUserName = currentUser?.name || currentMocUserName;
  const canEditEntities = ["ADMIN", "MANAGER", "SALES"].includes(currentUser?.role);
  const canManageSync = ["ADMIN", "MANAGER"].includes(currentUser?.role);

  const handleRunGmailSync = async () => {
    if (!canManageSync) {
      setNotice("この操作を実行する権限がありません");
      return;
    }

    closeMenus();
    setIsSyncingGmail(true);
    try {
      const response = await fetch("/api/admin/gmail/sync-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "pipeline" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 202) {
        throw new Error(result?.message || result?.error || "Gmail同期に失敗しました");
      }

      if (result.status === "already_running") {
        setNotice("Gmail同期はすでに実行中です");
        return;
      }

      const summary = result.summary || {};
      setHasPendingDataRefresh(true);
      setNotice(
        `Gmail同期が完了しました。取得${summary.fetched ?? 0}件 / 新規${summary.created ?? 0}件 / 案件${summary.projectCreated ?? 0}件 / 要員${summary.personCreated ?? 0}件。表示更新は手動で実行してください`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Gmail同期に失敗しました");
    } finally {
      setIsSyncingGmail(false);
    }
  };

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim();
    let result = projects;

    if (normalizedSearch) {
      result = result.filter((project) => textMatchesSearchQuery(collectProjectText(project), normalizedSearch));
    }

    if (filterValues.createdFrom || filterValues.createdTo) {
      result = result.filter((project) => {
        const createdDate = getProjectDate(project, "案件作成日");
        if (!createdDate) return true;
        if (filterValues.createdFrom && createdDate < filterValues.createdFrom) return false;
        if (filterValues.createdTo && createdDate > filterValues.createdTo) return false;
        return true;
      });
    }
    if (filterValues.projectId.trim()) {
      result = result.filter((project) => String(project.id).includes(filterValues.projectId.trim()));
    }
    if (filterValues.exclude.trim()) {
      const excluded = filterValues.exclude.trim();
      result = result.filter((project) => !textMatchesSearchQuery(collectProjectText(project), excluded));
    }
    if (filterValues.startMonthFrom || filterValues.startMonthTo) {
      result = result.filter((project) => {
        const startMonth = getProjectDate(project, "案件開始月");
        if (!startMonth) return true;
        if (filterValues.startMonthFrom && startMonth < filterValues.startMonthFrom) return false;
        if (filterValues.startMonthTo && startMonth > filterValues.startMonthTo) return false;
        return true;
      });
    }
    if (filterValues.skill.trim()) {
      const skill = filterValues.skill.trim();
      result = result.filter((project) => textMatchesSearchQuery(collectProjectText(project), skill));
    }
    if (filterValues.unitUndecidedOnly) {
      result = result.filter((project) => project.unitPriceValue === 0 || project.unitPrice === "未定");
    } else {
      if (filterValues.unitMin) result = result.filter((project) => project.unitPriceValue >= Number(filterValues.unitMin));
      if (filterValues.unitMax) result = result.filter((project) => project.unitPriceValue <= Number(filterValues.unitMax));
    }
    if (filterValues.prefecture.trim()) {
      const prefecture = filterValues.prefecture.trim();
      result = result.filter((project) => textMatchesSearchQuery(collectProjectText(project), prefecture));
    }
    if (filterValues.remote.length) {
      result = result.filter((project) => {
        const projectText = collectProjectText(project);
        return filterValues.remote.every((condition) => {
          if (condition === "フルリモート") return projectText.includes("フルリモート");
          return projectText.includes("リモート");
        });
      });
    }
    if (filterValues.workDays.length) {
      result = result.filter((project) => filterValues.workDays.some((condition) => collectProjectText(project).includes(condition)));
    }

    if (checkedFilters.hasResult) result = result.filter((project) => project.hasResult);
    if (checkedFilters.hideTradeNg) result = result.filter((project) => !project.hasTradeNg);
    if (checkedFilters.hideForeignNg) result = result.filter((project) => project.foreignNationalityPolicyRaw !== "NOT_ACCEPTABLE");
    if (checkedFilters.hide50sNg) {
      result = result.filter((project) => !/(50代|50歳|五十代).*(NG|不可)|50代不可|50代NG/i.test(project.ageConditionText || ""));
    }
    if (checkedFilters.hide60sNg) {
      result = result.filter((project) => !/(60代|60歳|六十代).*(NG|不可)|60代不可|60代NG|50代まで|50歳まで|59歳まで|60歳未満/i.test(project.ageConditionText || ""));
    }
    if (checkedFilters.createdByMe) result = result.filter((project) => project.createdByName === currentUserName);
    if (checkedFilters.recruitingOnly) result = result.filter((project) => project.isRecruiting);
    const selectedProjectFocusIds = selectedFocus.filter((id) => focusOptions.some((option) => option.id === id));
    if (selectedProjectFocusIds.length) {
      result = result.filter((project) => selectedProjectFocusIds.some((id) => matchesProjectFocus(project, id)));
    }

    if (selectedSort === "新着順") {
      result = [...result].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    }
    if (selectedSort === "名前順") {
      result = [...result].sort((a, b) => String(a.title).localeCompare(String(b.title), "ja"));
    }
    if (selectedSort === "単価が高い順") {
      result = [...result].sort((a, b) => b.unitPriceValue - a.unitPriceValue);
    }
    if (selectedSort === "単価が低い順") {
      result = [...result].sort((a, b) => a.unitPriceValue - b.unitPriceValue);
    }

    return result;
  }, [checkedFilters, currentUserName, filterValues, projects, search, selectedFocus, selectedSort]);

  const filteredPersons = useMemo(() => {
    const normalizedSearch = search.trim();
    let result = persons;

    if (normalizedSearch) {
      result = result.filter((person) => textMatchesSearchQuery(collectPersonText(person), normalizedSearch));
    }

    if (filterValues.createdFrom || filterValues.createdTo) {
      result = result.filter((person) => {
        const createdDate = person.createdAt || "";
        if (!createdDate) return true;
        if (filterValues.createdFrom && createdDate < filterValues.createdFrom) return false;
        if (filterValues.createdTo && createdDate > filterValues.createdTo) return false;
        return true;
      });
    }
    if (filterValues.projectId.trim()) {
      result = result.filter((person) => String(person.id).includes(filterValues.projectId.trim()));
    }
    if (filterValues.exclude.trim()) {
      const excluded = filterValues.exclude.trim();
      result = result.filter((person) => !textMatchesSearchQuery(collectPersonText(person), excluded));
    }
    if (filterValues.startMonthFrom || filterValues.startMonthTo) {
      result = result.filter((person) => {
        const availableFrom = person.availableFromRaw || "";
        if (!availableFrom) return true;
        if (filterValues.startMonthFrom && availableFrom < filterValues.startMonthFrom) return false;
        if (filterValues.startMonthTo && availableFrom > filterValues.startMonthTo) return false;
        return true;
      });
    }
    if (filterValues.skill.trim()) {
      const skill = filterValues.skill.trim();
      result = result.filter((person) => textMatchesSearchQuery(collectPersonText(person), skill));
    }
    if (filterValues.unitUndecidedOnly) {
      result = result.filter((person) => person.unitPriceValue === 0 || person.unitPrice === "未定");
    } else {
      if (filterValues.unitMin) result = result.filter((person) => person.unitPriceValue >= Number(filterValues.unitMin));
      if (filterValues.unitMax) result = result.filter((person) => person.unitPriceValue <= Number(filterValues.unitMax));
    }
    if (filterValues.prefecture.trim()) {
      const location = filterValues.prefecture.trim();
      result = result.filter((person) => textMatchesSearchQuery(collectPersonText(person), location));
    }
    if (filterValues.remote.length) {
      result = result.filter((person) => {
        const personText = collectPersonText(person);
        return filterValues.remote.some((condition) => personText.includes(condition.toLowerCase().replace("可", "")) || personText.includes(condition.toLowerCase()));
      });
    }
    if (filterValues.statuses.length) {
      result = result.filter((person) => filterValues.statuses.includes(person.status));
    }

    if (checkedFilters.hideForeignNg) result = result.filter((person) => !isForeignNationality(person.nationality));
    if (checkedFilters.hide50sNg) result = result.filter((person) => !person.age || person.age < 50 || person.age >= 60);
    if (checkedFilters.hide60sNg) result = result.filter((person) => !person.age || person.age < 60);
    if (checkedFilters.hasResult) result = result.filter((person) => person.hasResult);
    if (checkedFilters.hideTradeNg) result = result.filter((person) => !person.hasTradeNg);
    if (checkedFilters.createdByMe) result = result.filter((person) => person.createdByName === currentUserName);
    if (checkedFilters.recruitingOnly) result = result.filter((person) => person.statusRaw === "AVAILABLE");
    if (selectedSort === "新着順") {
      result = [...result].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    }
    if (selectedSort === "名前順") {
      result = [...result].sort((a, b) => String(a.name).localeCompare(String(b.name), "ja"));
    }
    if (selectedSort === "単価が高い順") {
      result = [...result].sort((a, b) => b.unitPriceValue - a.unitPriceValue);
    }
    if (selectedSort === "単価が低い順") {
      result = [...result].sort((a, b) => a.unitPriceValue - b.unitPriceValue);
    }

    return result;
  }, [checkedFilters, currentUserName, filterValues, persons, search, selectedSort]);

  const filteredUnclassifiedMails = useMemo(() => {
    const normalizedSearch = search.trim();
    let result = unclassifiedMails;

    if (normalizedSearch) {
      result = result.filter((mail) => textMatchesSearchQuery(collectMailText(mail), normalizedSearch));
    }

    if (filterValues.exclude.trim()) {
      const excluded = filterValues.exclude.trim();
      result = result.filter((mail) => !textMatchesSearchQuery(collectMailText(mail), excluded));
    }

    if (checkedFilters.hasResult) result = result.filter((mail) => mail.hasResult);
    if (checkedFilters.hideTradeNg) result = result.filter((mail) => !mail.hasTradeNg);

    if (selectedSort === "新着順" || selectedSort === "おすすめ順") {
      result = [...result].sort((a, b) => String(b.receivedAtRaw || b.receivedAt).localeCompare(String(a.receivedAtRaw || a.receivedAt)));
    }
    if (selectedSort === "名前順") {
      result = [...result].sort((a, b) => String(a.subject).localeCompare(String(b.subject), "ja"));
    }

    return result;
  }, [checkedFilters, filterValues.exclude, search, selectedSort, unclassifiedMails]);

  const isProjectTab = activeTab === "案件";
  const isPersonTab = activeTab === "要員";
  const isUnclassifiedTab = activeTab === "未分類";
  const activeRows = isProjectTab ? filteredProjects : isPersonTab ? filteredPersons : filteredUnclassifiedMails;
  const totalPages = Math.max(1, Math.ceil(activeRows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const displayStart = activeRows.length ? (safeCurrentPage - 1) * pageSize + 1 : 0;
  const displayEnd = Math.min(safeCurrentPage * pageSize, activeRows.length);
  const displayProjects = filteredProjects.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);
  const displayPersons = filteredPersons.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);
  const displayUnclassifiedMails = filteredUnclassifiedMails.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);
  const activeConditions = useMemo(() => (isUnclassifiedTab ? [] : buildActiveConditions(filterValues, isProjectTab)), [filterValues, isProjectTab, isUnclassifiedTab]);
  const toolbarConditions = activeConditions;
  const focusCount = isProjectTab
    ? projects.filter((project) => focusOptions.some((option) => matchesProjectFocus(project, option.id))).length
    : 0;
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, checkedFilters, filterValues, pageSize, search, selectedFocus, selectedSort]);

  const closeMenus = () => {
    setFocusMenuOpen(false);
    setSortMenuOpen(false);
    setPageSizeMenuOpen(false);
    setMenuProjectId(null);
    setSideMenuOpen(false);
  };

  useEffect(() => {
    if (!focusMenuOpen && !sortMenuOpen && !pageSizeMenuOpen && !menuProjectId) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeMenus();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusMenuOpen, menuProjectId, pageSizeMenuOpen, sortMenuOpen]);

  const handleQuickFilterChange = (id, group) => {
    if (group === "focus") {
      setSelectedFocus((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
      return;
    }
    setCheckedFilters((current) => ({ ...current, [id]: !current[id] }));
  };

  const handleFilterChange = (key, value) => {
    setFilterValues((current) => ({ ...current, [key]: value }));
  };

  const handleFilterToggle = (key, value) => {
    setFilterValues((current) => {
      const selectedValues = current[key] || [];
      return {
        ...current,
        [key]: selectedValues.includes(value) ? selectedValues.filter((item) => item !== value) : [...selectedValues, value]
      };
    });
  };

  const handleFilterClear = () => {
    setFilterValues(createEmptyFilterValues());
  };

  const handleConditionRemove = (id) => {
    setFilterValues((current) => {
      if (id === "createdAt") return { ...current, createdFrom: "", createdTo: "" };
      if (id === "startMonth") return { ...current, startMonthFrom: "", startMonthTo: "" };
      if (id === "unit") return { ...current, unitMin: "", unitMax: "", unitUndecidedOnly: false };
      if (id === "remote" || id === "workDays" || id === "statuses") return { ...current, [id]: [] };
      return { ...current, [id]: "" };
    });
  };

  const handleAddProposal = (project) => {
    if (!canEditEntities) {
      setNotice("この操作を実行する権限がありません");
      return;
    }
    console.log("project proposal unavailable", project?.id || project?.dbId || "");
    setNotice("提案開始は未実装です。DB登録は行われません。");
    setMenuProjectId(null);
  };

  const handleCopyUrl = async (project) => {
    console.log("project copy draft", project?.id || project?.dbId || "");
    const projectText = `案件ID: ${project.id}\n案件名: ${project.title}`;
    try {
      await navigator.clipboard?.writeText(projectText);
      setNotice(`案件情報をコピーしました: ${project.title}`);
    } catch {
      setNotice(`コピー対象: ${projectText}`);
    }
    setMenuProjectId(null);
  };

  const handleDetailAction = async (action, project) => {
    console.log(`project ${action} draft`, project?.id || project?.dbId || "");

    if (["edit", "archive", "proposal", "unclassify"].includes(action) && !canEditEntities) {
      setNotice("この操作を実行する権限がありません");
      return;
    }

    if (action === "edit") {
      closeMenus();
      const detailedProject = await loadSelectedProjectDetail(project);
      setSelectedProject(detailedProject);
      setActiveModal("editProject");
      return;
    }

    if (action === "archive") {
      closeMenus();
      setIsLoadingDbData(true);
      try {
        const response = await fetch("/api/projects", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: project.dbId, action: "archive" })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || "案件アーカイブに失敗しました");
        const nextData = await reloadDashboardData();
        setSelectedProject(null);
        setNotice("案件をアーカイブしました");
        setCurrentPage(1);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "案件アーカイブに失敗しました");
      } finally {
        setIsLoadingDbData(false);
      }
      return;
    }

    if (action === "unclassify") {
      await handleMoveEntityToUnclassified("project", project);
      return;
    }

    setMenuProjectId(null);
    setSideMenuOpen(false);
  };

  const handleMoveEntityToUnclassified = async (entityType, entity) => {
    if (!entity?.dbId) return;
    if (!canEditEntities) {
      setNotice("この操作を実行する権限がありません");
      return;
    }

    closeMenus();
    setIsLoadingDbData(true);
    try {
      const response = await fetch("/api/entities/move-to-unclassified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId: entity.dbId })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "未分類への移行に失敗しました");

      await reloadDashboardData();
      setSelectedProject(null);
      setSelectedPerson(null);
      setSelectedMail(null);
      setActiveTab("未分類");
      setCurrentPage(1);
      setNotice("未分類へ移行しました");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "未分類への移行に失敗しました");
    } finally {
      setIsLoadingDbData(false);
    }
  };

  const handleUnclassifiedMailMove = async (target, mail) => {
    if (!mail?.dbId) return;
    if (!canEditEntities) {
      setNotice("この操作を実行する権限がありません");
      return;
    }

    setIsMovingMail(true);
    setIsLoadingDbData(true);
    try {
      const response = await fetch(`/api/mail-notifications/${mail.dbId}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "未分類メールの移動に失敗しました");

      await reloadDashboardData();
      setSelectedMail(null);
      setActiveTab(target === "project" ? "案件" : "要員");
      setCurrentPage(1);
      setNotice(target === "project" ? "未分類メールを案件として扱いました" : "未分類メールを要員として扱いました");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "未分類メールの移動に失敗しました");
    } finally {
      setIsMovingMail(false);
      setIsLoadingDbData(false);
    }
  };

  const applyKeyword = () => {
    setSearch(keywordDraft.include);
    setActiveModal(null);
  };

  if (authStatus === "checking") {
    return (
      <main className="auth-page">
        <section className="auth-panel auth-panel-compact" aria-live="polite">
          <div className="auth-brand">
            <span className="brand-logo">SKV</span>
            <span className="brand-badge">管理コンソール</span>
          </div>
          <p className="auth-message">認証状態を確認中です</p>
        </section>
      </main>
    );
  }

  if (authStatus !== "authenticated") {
    return <LoginPanel onAuthenticated={handleAuthenticated} />;
  }

  return (
    <main className="console-app">
      <Header currentUser={currentUser} onLogout={handleLogout} />
      <SearchToolbar
        activeTab={activeTab}
        activeConditions={toolbarConditions}
        canRunSync={canManageSync}
        canCreate={canEditEntities}
        checkedFilters={checkedFilters}
        displayEnd={displayEnd}
        displayStart={displayStart}
        focusCount={focusCount}
        focusMenuOpen={focusMenuOpen}
        hasPendingRefresh={hasPendingDataRefresh}
        isSyncing={isSyncingGmail}
        onConditionRemove={handleConditionRemove}
        onFocusToggle={() => {
          setFocusMenuOpen(!focusMenuOpen);
          setSortMenuOpen(false);
        }}
        onOpenCreate={() => {
          if (!canEditEntities) {
            setNotice("この操作を実行する権限がありません");
            return;
          }
          closeMenus();
          setSelectedProject(null);
          setSelectedPerson(null);
          setSelectedMail(null);
          setActiveModal(isProjectTab ? "create" : "createPerson");
        }}
        onOpenFilter={() => {
          closeMenus();
          setActiveModal("filter");
        }}
        onOpenHistory={() => {
          closeMenus();
          setActiveModal("history");
        }}
        onOpenKeyword={() => {
          closeMenus();
          setKeywordDraft({ include: search, exclude: "" });
          setActiveModal("keyword");
        }}
        onQuickFilterChange={handleQuickFilterChange}
        onRefresh={handleRefresh}
        onRunSync={handleRunGmailSync}
        onSearchChange={setSearch}
        onSortOpen={() => {
          setSortMenuOpen(!sortMenuOpen);
          setFocusMenuOpen(false);
        }}
        onSortSelect={(value) => {
          setSelectedSort(value);
          setSortMenuOpen(false);
        }}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedProject(null);
          setSelectedPerson(null);
          setSelectedMail(null);
          setFocusMenuOpen(false);
          setCurrentPage(1);
        }}
        pageSize={pageSize}
        pageSizeMenuOpen={pageSizeMenuOpen}
        resultCount={activeRows.length}
        search={search}
        selectedFocus={selectedFocus}
        selectedSort={selectedSort}
        setPageSize={setPageSize}
        setPageSizeMenuOpen={setPageSizeMenuOpen}
        sortMenuOpen={sortMenuOpen}
      />

      {notice ? (
        <div className="notice" role="status">
          {notice}
          <button onClick={() => setNotice("")} type="button" aria-label="通知を閉じる">
            ×
          </button>
        </div>
      ) : null}

      {isLoadingDbData ? (
        <div className="db-loading" role="status">
          DBからseedデータを読み込み中です
        </div>
      ) : null}

      <section className="content-grid">
        <div className="list-panel">
          <div className="top-pagination">
            <Pagination currentPage={safeCurrentPage} onPageChange={setCurrentPage} totalPages={totalPages} />
          </div>
          {isProjectTab ? (
            <>
              <ProjectTable
                canEdit={canEditEntities}
                compact={false}
                menuProjectId={menuProjectId}
                onAddProposal={handleAddProposal}
                onCopyUrl={handleCopyUrl}
                onDetailAction={handleDetailAction}
                onMenuToggle={(id) => setMenuProjectId(menuProjectId === id ? null : id)}
                onSelectProject={handleSelectProject}
                projects={displayProjects}
                selectedProjectId={selectedProject?.id}
              />
              {!displayProjects.length && !isLoadingDbData ? <div className="empty-state">表示できる案件データがありません</div> : null}
            </>
          ) : isPersonTab ? (
            <>
              <PersonTable
                onSelectPerson={handleSelectPerson}
                persons={displayPersons}
                selectedPersonId={selectedPerson?.id}
              />
              {!displayPersons.length && !isLoadingDbData ? <div className="empty-state">表示できる要員データがありません</div> : null}
            </>
          ) : (
            <>
              <UnclassifiedMailTable
                mails={displayUnclassifiedMails}
                onSelectMail={(mail) => {
                  setSelectedMail(mail);
                }}
                selectedMailId={selectedMail?.id}
              />
              {!displayUnclassifiedMails.length && !isLoadingDbData ? <div className="empty-state">表示できる未分類メールがありません</div> : null}
            </>
          )}
          <div className="bottom-pagination">
            <Pagination currentPage={safeCurrentPage} onPageChange={setCurrentPage} totalPages={totalPages} />
          </div>
        </div>

        {isProjectTab ? (
          <ProjectDetailPane
            canEdit={canEditEntities}
            currentUserRole={currentUser?.role}
            onAddProposal={handleAddProposal}
            onClose={() => setSelectedProject(null)}
            onCompanyContactRoleLinked={handleProjectCompanyContactRoleLinked}
            onCopyUrl={handleCopyUrl}
            onDetailAction={handleDetailAction}
            project={selectedProject}
            projectCompanyContactRoleLinkWriteAllowed={projectCompanyContactRoleLinkWriteAllowed}
          />
        ) : null}
        {isPersonTab ? (
          <PersonDetailPane
            canEdit={canEditEntities}
            currentUserRole={currentUser?.role}
            onClose={() => setSelectedPerson(null)}
            onMoveToUnclassified={(person) => handleMoveEntityToUnclassified("person", person)}
            onOwnerLinkLinked={handlePersonOwnerLinkLinked}
            person={selectedPerson}
            personOwnerLinkWriteAllowed={personOwnerLinkWriteAllowed}
          />
        ) : null}
        {isUnclassifiedTab ? (
          <UnclassifiedMailDetailPane
            canEdit={canEditEntities}
            isMoving={isMovingMail}
            mail={selectedMail}
            onClose={() => setSelectedMail(null)}
            onMoveToPerson={(mail) => handleUnclassifiedMailMove("person", mail)}
            onMoveToProject={(mail) => handleUnclassifiedMailMove("project", mail)}
          />
        ) : null}
      </section>

      {activeModal === "filter" ? (
        <FilterModal
          onApply={() => setActiveModal(null)}
          onChange={handleFilterChange}
          onClear={handleFilterClear}
          onClose={() => setActiveModal(null)}
          onToggle={handleFilterToggle}
          rows={isProjectTab ? filterFormRows : personFilterFormRows}
          values={filterValues}
        />
      ) : null}
      {activeModal === "keyword" ? (
        <KeywordModal keywordDraft={keywordDraft} onApply={applyKeyword} onChange={setKeywordDraft} onClose={() => setActiveModal(null)} />
      ) : null}
      {activeModal === "history" ? (
        <SearchHistoryModal
          onApply={(history) => {
            setSearch(history.keyword);
            setActiveModal(null);
          }}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
      {activeModal === "create" ? <ProjectCreateDrawer mode="create" onClose={() => setActiveModal(null)} onSaved={handleProjectCreated} /> : null}
      {activeModal === "editProject" && selectedProject ? (
        <ProjectCreateDrawer
          initialValues={selectedProject.formValues || {}}
          mode="edit"
          onClose={() => setActiveModal(null)}
          onSaved={handleProjectUpdated}
          projectId={selectedProject.dbId}
        />
      ) : null}
      {activeModal === "createPerson" ? <PersonCreateDrawer onClose={() => setActiveModal(null)} onSaved={handlePersonCreated} /> : null}
    </main>
  );
}
