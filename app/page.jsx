"use client";

import { useEffect, useMemo, useState } from "react";
import DbReadOnlyPanels from "../components/DbReadOnlyPanels";
import FilterModal from "../components/FilterModal";
import Header from "../components/Header";
import KeywordModal from "../components/KeywordModal";
import Pagination from "../components/Pagination";
import ProjectCreateModal from "../components/ProjectCreateModal";
import ProjectDetailPane from "../components/ProjectDetailPane";
import ProjectTable from "../components/ProjectTable";
import SearchHistoryModal from "../components/SearchHistoryModal";
import SearchToolbar from "../components/SearchToolbar";
import { focusOptions, quickFilters } from "../data/mockProjects";

const defaultQuickFilters = Object.fromEntries(quickFilters.map((filter) => [filter.id, Boolean(filter.defaultChecked)]));

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

function buildActiveConditions(filters) {
  const conditions = [];

  if (filters.createdFrom || filters.createdTo) {
    conditions.push({
      id: "createdAt",
      label: "案件作成日",
      value: `${filters.createdFrom || "下限"} ~${filters.createdTo ? ` ${filters.createdTo}` : ""}`
    });
  }
  if (filters.projectId.trim()) conditions.push({ id: "projectId", label: "案件ID", value: filters.projectId.trim() });
  if (filters.exclude.trim()) conditions.push({ id: "exclude", label: "除外キーワード", value: filters.exclude.trim() });
  if (filters.startMonthFrom || filters.startMonthTo) {
    conditions.push({
      id: "startMonth",
      label: "案件開始月",
      value: `${filters.startMonthFrom || "下限"} ~${filters.startMonthTo ? ` ${filters.startMonthTo}` : ""}`
    });
  }
  if (filters.skill.trim()) conditions.push({ id: "skill", label: "スキル", value: filters.skill.trim() });
  if (filters.unitMin || filters.unitMax || filters.unitUndecidedOnly) {
    conditions.push({
      id: "unit",
      label: "単価",
      value: filters.unitUndecidedOnly ? "未定のみ" : `${filters.unitMin || "下限"} ~ ${filters.unitMax || "上限"}万円`
    });
  }
  if (filters.prefecture.trim()) conditions.push({ id: "prefecture", label: "都道府県", value: filters.prefecture.trim() });
  if (filters.remote.length) conditions.push({ id: "remote", label: "こだわり条件", value: filters.remote.join("、") });
  if (filters.workDays.length) conditions.push({ id: "workDays", label: "想定稼働日数", value: filters.workDays.join("、") });

  return conditions;
}

export default function Home() {
  const [projects, setProjects] = useState([]);
  const [dbData, setDbData] = useState({ persons: [], mailNotifications: [], proposals: [], distributionLogs: [] });
  const [isLoadingDbData, setIsLoadingDbData] = useState(true);
  const [activeTab, setActiveTab] = useState("IT");
  const [search, setSearch] = useState("");
  const [checkedFilters, setCheckedFilters] = useState(defaultQuickFilters);
  const [selectedFocus, setSelectedFocus] = useState([]);
  const [selectedSort, setSelectedSort] = useState("おすすめ順");
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProject, setSelectedProject] = useState(null);
  const [menuProjectId, setMenuProjectId] = useState(null);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [focusMenuOpen, setFocusMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [pageSizeMenuOpen, setPageSizeMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [proposalIds, setProposalIds] = useState([]);
  const [notice, setNotice] = useState("");
  const [keywordDraft, setKeywordDraft] = useState({ include: "", exclude: "" });
  const [filterValues, setFilterValues] = useState(createDefaultFilterValues);

  useEffect(() => {
    let ignore = false;

    async function loadDashboardData() {
      setIsLoadingDbData(true);
      try {
        const response = await fetch("/api/dashboard-data", { cache: "no-store" });
        if (!response.ok) throw new Error("DBデータの取得に失敗しました");
        const nextData = await response.json();
        if (ignore) return;
        setProjects(nextData.projects || []);
        setDbData({
          persons: nextData.persons || [],
          mailNotifications: nextData.mailNotifications || [],
          proposals: nextData.proposals || [],
          distributionLogs: nextData.distributionLogs || []
        });
      } catch (error) {
        if (!ignore) setNotice(error instanceof Error ? error.message : "DBデータの取得に失敗しました");
      } finally {
        if (!ignore) setIsLoadingDbData(false);
      }
    }

    loadDashboardData();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredProjects = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    let result = projects;

    if (normalized) {
      result = result.filter((project) => {
        const haystack = [project.id, project.title, project.company, project.unitPrice, project.locations.join(" "), project.tags.join(" ")]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalized);
      });
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
      const excluded = filterValues.exclude.trim().toLowerCase();
      result = result.filter((project) => !collectProjectText(project).includes(excluded));
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
      const skill = filterValues.skill.trim().toLowerCase();
      result = result.filter((project) => collectProjectText(project).includes(skill));
    }
    if (filterValues.unitUndecidedOnly) {
      result = result.filter((project) => project.unitPriceValue === 0 || project.unitPrice === "未定");
    } else {
      if (filterValues.unitMin) result = result.filter((project) => project.unitPriceValue >= Number(filterValues.unitMin));
      if (filterValues.unitMax) result = result.filter((project) => project.unitPriceValue <= Number(filterValues.unitMax));
    }
    if (filterValues.prefecture.trim()) {
      const prefecture = filterValues.prefecture.trim().toLowerCase();
      result = result.filter((project) => collectProjectText(project).includes(prefecture));
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
    if (selectedFocus.length) {
      const selectedLabels = focusOptions.filter((option) => selectedFocus.includes(option.id)).map((option) => option.label);
      result = result.filter((project) => selectedLabels.some((label) => project.attention?.includes(label)));
    }

    if (selectedSort === "新着順") {
      result = [...result].sort((a, b) => b.id - a.id);
    }
    if (selectedSort === "単価が高い順") {
      result = [...result].sort((a, b) => b.unitPriceValue - a.unitPriceValue);
    }
    if (selectedSort === "単価が低い順") {
      result = [...result].sort((a, b) => a.unitPriceValue - b.unitPriceValue);
    }

    return result;
  }, [checkedFilters.hasResult, filterValues, projects, search, selectedFocus, selectedSort]);

  const displayProjects = filteredProjects.slice(0, Math.min(pageSize, filteredProjects.length));
  const activeConditions = useMemo(() => buildActiveConditions(filterValues), [filterValues]);

  const closeMenus = () => {
    setFocusMenuOpen(false);
    setSortMenuOpen(false);
    setPageSizeMenuOpen(false);
    setMenuProjectId(null);
    setSideMenuOpen(false);
  };

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
      if (id === "remote" || id === "workDays") return { ...current, [id]: [] };
      return { ...current, [id]: "" };
    });
  };

  const handleAddProposal = (project) => {
    setNotice(`「${project.title}」の提案作成はまだ未実装です（DB読み取り専用）`);
    setMenuProjectId(null);
  };

  const handleCopyUrl = (project) => {
    setNotice(`案件URLをコピーしました: /projects/${project.id}`);
    setMenuProjectId(null);
  };

  const handleMemoSave = (projectId, memo) => {
    setNotice("共有メモ保存はまだ未実装です（DB読み取り専用）");
  };

  const handleDetailAction = (action, project) => {
    if (action === "edit") {
      setNotice(`「${project.title}」の編集はまだ未実装です（DB読み取り専用）`);
    }

    if (action === "hide" || action === "delete") {
      setNotice(action === "hide" ? "非表示操作はまだ未実装です（DB読み取り専用）" : "削除操作はまだ未実装です（DB読み取り専用）");
    }

    if (action === "closeRecruiting") {
      setNotice("募集終了操作はまだ未実装です（DB読み取り専用）");
    }

    setMenuProjectId(null);
    setSideMenuOpen(false);
  };

  const handleCreate = () => {
    setActiveModal(null);
    setNotice("案件作成はまだ未実装です（DB読み取り専用）");
  };

  const applyKeyword = () => {
    setSearch(keywordDraft.include);
    setActiveModal(null);
  };

  return (
    <main className="console-app">
      <Header />
      <SearchToolbar
        activeTab={activeTab}
        activeConditions={activeConditions}
        checkedFilters={checkedFilters}
        focusMenuOpen={focusMenuOpen}
        onConditionRemove={handleConditionRemove}
        onFocusToggle={() => {
          setFocusMenuOpen(!focusMenuOpen);
          setSortMenuOpen(false);
        }}
        onOpenCreate={() => {
          closeMenus();
          setNotice("案件登録はまだ未実装です（DB読み取り専用）");
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
        }}
        pageSize={pageSize}
        pageSizeMenuOpen={pageSizeMenuOpen}
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

      <section className={`content-grid ${selectedProject ? "with-detail" : ""}`}>
        <div className="list-panel">
          <div className="top-pagination">
            <Pagination currentPage={currentPage} onPageChange={setCurrentPage} compact={Boolean(selectedProject)} />
          </div>
          <ProjectTable
            compact={Boolean(selectedProject)}
            menuProjectId={menuProjectId}
            onAddProposal={handleAddProposal}
            onCopyUrl={handleCopyUrl}
            onDetailAction={handleDetailAction}
            onMenuToggle={(id) => setMenuProjectId(menuProjectId === id ? null : id)}
            onSelectProject={(project) => {
              setSelectedProject(project);
              setMenuProjectId(null);
            }}
            projects={displayProjects}
            proposalIds={proposalIds}
            selectedProjectId={selectedProject?.id}
          />
          {!displayProjects.length && !isLoadingDbData ? <div className="empty-state">表示できる案件データがありません</div> : null}
          <div className="bottom-pagination">
            <Pagination currentPage={currentPage} onPageChange={setCurrentPage} />
          </div>
        </div>

        <ProjectDetailPane
          menuOpen={sideMenuOpen}
          onAddProposal={handleAddProposal}
          onClose={() => setSelectedProject(null)}
          onCopyUrl={handleCopyUrl}
          onDetailAction={handleDetailAction}
          onMemoSave={handleMemoSave}
          onMenuToggle={() => setSideMenuOpen(!sideMenuOpen)}
          project={selectedProject}
          proposalIds={proposalIds}
        />
      </section>

      <DbReadOnlyPanels data={dbData} />

      {activeModal === "filter" ? (
        <FilterModal
          onApply={() => setActiveModal(null)}
          onChange={handleFilterChange}
          onClear={handleFilterClear}
          onClose={() => setActiveModal(null)}
          onToggle={handleFilterToggle}
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
      {activeModal === "create" ? <ProjectCreateModal onClose={() => setActiveModal(null)} onCreate={handleCreate} /> : null}
    </main>
  );
}
