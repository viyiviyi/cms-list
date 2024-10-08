"use client";
import { ArtList } from "@/Components/art_list";
import { Loading } from "@/Components/loading";
import { addHistory, UrlHistory } from "@/Components/url_history";
import { VideoList } from "@/Components/video_list";
import { Art } from "@/model/art";
import { Type } from "@/model/type";
import { Video } from "@/model/video";
import axios from "axios";
import Head from "next/head";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";

export default function Home() {
    const { query, push, replace } = useRouter();
    const [types, setTypes] = useState<Type[]>([]);
    const [vods, setVods] = useState<Video[]>([]);
    const [arts, setArts] = useState<Art[]>([]);
    const [page, setPage] = useState(1);
    const [input, setInput] = useState<string>("");
    const [config, setConfig] = useState<{ url?: string; type: "vod" | "art" }>({
        type: "vod",
        url: "",
    });
    const [pageCount, setPageCount] = useState(100);
    const [tId, setTypeId] = useState(0);
    const [loading, setLoading] = useState(false);
    const [filterText, setFilterText] = useState("");
    const setScroolLeft = useState(0)[1];
    const getList = useCallback(
        (pg: number, wd: string, t: number) => {
            if (!config.url) return;
            if (loading) return;
            if (pg > 1 && pg > pageCount) return;
            setLoading(true);
            setPage(pg);
            setTypeId(t);
            let q: { [k: string]: string | undefined } = {
                wd: wd || undefined,
                pg: undefined,
                t: t + "" || undefined,
                type: (query.type as string) || undefined,
            };

            let queryString = Object.keys(q)
                .filter((k) => q[k])
                .map((k) => k + "=" + q[k])
                .join("&");
            push("?url=" + config.url + "&" + queryString);

            return axios(
                "https://proxy.eaias.com/" + config.url + "?ac=detail" + "&pg=" + (pg || "") + "&wd=" + (wd || "") + "&t=" + (t || "")
            )
                .then((res) => res.data)
                .then((data) => {
                    if (!Array.isArray(data.list)) return;
                    setConfig((conf) => {
                        if (conf.type == "vod") setVods((v) => (pg == 1 ? [...data.list] : [...v, ...data.list]));
                        else setArts((v) => (pg == 1 ? [...data.list] : [...v, ...data.list]));
                        return conf;
                    });
                    setPageCount(data.pagecount);
                })
                .catch((e) => {
                    if (e.status && e.status == 403) {
                        alert("无权限访问此功能");
                    }
                    console.error(e);
                })
                .finally(() =>
                    setTimeout(() => {
                        setLoading(false);
                    }, 500)
                );
        },
        [config.url, loading, pageCount, push, query.type]
    );
    const init = useCallback((url: string, wd: string, tid: number) => {
        if (!url) return;
        setLoading(true);
        axios("https://proxy.eaias.com/" + url + "?ac=list")
            .then((res) => res.data)
            .then((data) => {
                if (!Array.isArray(data.class)) return;
                setTypes(data.class);
            })
            .catch((e) => {
                console.error(e);
            });
        axios("https://proxy.eaias.com/" + url + "?ac=detail" + "&pg=1" + "&wd=" + (wd || "") + "&t=" + (tid || ""))
            .then((res) => res.data)
            .then((data) => {
                if (!Array.isArray(data.list)) return;
                setConfig((v) => {
                    if (v.type == "vod") setVods(data.list);
                    else setArts(data.list);
                    return v;
                });
            })
            .catch((e) => {
                console.error(e);
            })
            .finally(() =>
                setTimeout(() => {
                    setLoading(false);
                }, 500)
            );
    }, []);

    useEffect(() => {
        if (query.url) {
            let url = ((query.url as string) || "").split("?")[0];
            let conf = {
                url: url,
                type: query.type ? (query.type as "art" | "vod") : url.includes("/art") ? "art" : "vod",
            };
            setConfig(conf);
            addHistory(conf.url + "?type=" + conf.type, conf.type + "|" + new URL(url).hostname);
            if (query.t) {
                setTypeId(Number(query.t));
            }
            if (query.wd) {
                setFilterText(query.wd as string);
            }
            if (url) {
                init(url, query.wd as string, Number(query.t));
            }
        } else {
            setConfig({ url: "", type: "vod" });
        }
    }, [init, query.t, query.type, query.url, query.wd]);

    if (!config.url) {
        return (
            <div className="init-wrap">
                <div>
                    <input
                        type="text"
                        placeholder="请输入采集地址"
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                        }}
                        onKeyDown={(e) => {
                            if (e.key == "Enter") {
                                setInput("");
                                replace("/?url=" + input);
                            }
                        }}
                    />
                    <button
                        onClick={() => {
                            setInput("");
                            replace("/?url=" + input + "&type=vod");
                        }}
                    >
                        视频
                    </button>
                    <button
                        onClick={() => {
                            setInput("");
                            replace("/?url=" + input + "&type=art");
                        }}
                    >
                        图文
                    </button>
                </div>
                <UrlHistory />
            </div>
        );
    }
    return (
        <>
            <Head>
                <title>CMS Ls</title>
                <meta name="description" content="直接浏览采集站数据" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <div style={{ display: "flex", flexDirection: "column", height: "100vbh" }}>
                <div className="header">
                    <div className="logo"></div>
                    <div className="search">
                        <input
                            type="text"
                            value={filterText}
                            onChange={(e) => {
                                setFilterText(e.target.value);
                            }}
                            onKeyUp={(e) => {
                                if (e.key == "Enter") {
                                    getList(1, filterText, tId);
                                }
                            }}
                            placeholder="关键字"
                        />
                        <button
                            onClick={() => {
                                getList(1, filterText, tId);
                            }}
                        >
                            <svg
                                viewBox="0 0 1024 1024"
                                version="1.1"
                                xmlns="http://www.w3.org/2000/svg"
                                p-id="1836"
                                width={"1em"}
                                height={"1em"}
                            >
                                <path
                                    d="M467.92892 935.905986a467.92892 467.92892 0 1 1 331.010811-136.918108 466.424325 466.424325 0 0 1-331.010811 136.918108zM467.92892 150.507607a317.46946 317.46946 0 1 0 225.689189 93.284865 315.964865 315.964865 0 0 0-225.689189-93.284865zM771.556109 922.515094l151.587906-151.587905 101.033527 101.108757-151.587905 151.587905z"
                                    fill="#272536"
                                    p-id="1837"
                                ></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div
                    className="type-list"
                    onWheel={(e) => {
                        let ele = e.target as HTMLDivElement;
                        if (!ele.classList.contains("type-list")) {
                            ele = document.getElementsByClassName("type-list")[0] as HTMLDivElement;
                        }
                        setScroolLeft((v) => {
                            ele.scrollTo(v + e.deltaY, 0);
                            if (v + e.deltaY < 0) return 0;
                            if (v + e.deltaY > ele.scrollWidth - ele.offsetWidth) return ele.scrollWidth - ele.offsetWidth;
                            return v + e.deltaY;
                        });
                    }}
                >
                    {types.map((v) => {
                        return (
                            <span
                                className={"type-item " + (tId + "" == v.type_id + "" ? "activity" : "")}
                                key={v.type_id}
                                onClick={() => {
                                    getList(1, filterText, tId == v.type_id ? 0 : v.type_id);
                                }}
                            >
                                {v.type_name}
                            </span>
                        );
                    })}
                </div>
                {config.type == "vod" ? (
                    <VideoList
                        vods={vods}
                        onScroolEnd={() => {
                            getList(page + 1, filterText, tId);
                        }}
                        onType={(tid) => {
                            getList(1, filterText, tid);
                        }}
                        onScroolTop={() => {
                            getList(1, filterText, tId);
                        }}
                    ></VideoList>
                ) : (
                    <ArtList
                        arts={arts}
                        onScroolEnd={() => {
                            getList(page + 1, filterText, tId);
                        }}
                        onType={(tid) => {
                            getList(1, filterText, tid);
                        }}
                        onScroolTop={() => {
                            getList(1, filterText, tId);
                        }}
                    ></ArtList>
                )}
                <Loading loading={loading} />
            </div>
        </>
    );
}
